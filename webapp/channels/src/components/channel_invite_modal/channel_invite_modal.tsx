// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import isEqual from 'lodash/isEqual';
import React from 'react';
import {Modal} from 'react-bootstrap';
import type {IntlShape} from 'react-intl';
import {injectIntl, FormattedMessage} from 'react-intl';
import styled from 'styled-components';

import type {Channel} from '@mattermost/types/channels';
import type {Group, GroupSearchParams} from '@mattermost/types/groups';
import type {TeamMembership} from '@mattermost/types/teams';
import type {UserProfile} from '@mattermost/types/users';
import type {RelationOneToOne} from '@mattermost/types/utilities';

import {Client4} from 'mattermost-redux/client';
import type {ActionResult} from 'mattermost-redux/types/actions';
import {filterGroupsMatchingTerm} from 'mattermost-redux/utils/group_utils';
import {displayUsername, filterProfilesMatchingWithTerm, isGuest} from 'mattermost-redux/utils/user_utils';

import InvitationModal from 'components/invitation_modal';
import MultiSelect from 'components/multiselect/multiselect';
import type {Value} from 'components/multiselect/multiselect';
import ProfilePicture from 'components/profile_picture';
import ToggleModalButton from 'components/toggle_modal_button';
import BotTag from 'components/widgets/tag/bot_tag';
import GuestTag from 'components/widgets/tag/guest_tag';

import Constants, {ModalIdentifiers} from 'utils/constants';
import {localizeMessage, sortUsersAndGroups} from 'utils/utils';

import GroupOption from './group_option';
import TeamWarningBanner from './team_warning_banner';

const USERS_PER_PAGE = 50;
const USERS_FROM_DMS = 10;
const MAX_USERS = 25;

// For RemoTalk plugin
type FilterOption = {value: number; label: string};
type StaffSummary = {
    hospital?: string;
    department?: string;
    profession?: string;
};
type FilterParams = {
    hospital_id?: number | undefined;
    department_id?: number | undefined;
    profession_id?: number | undefined;
}

type UserProfileValue = Value & UserProfile;

type GroupValue = Value & Group;

export type Props = {
    profilesNotInCurrentChannel: UserProfile[];
    profilesInCurrentChannel: UserProfile[];
    profilesNotInCurrentTeam: UserProfile[];
    profilesFromRecentDMs: UserProfile[];
    intl: IntlShape;
    membersInTeam?: RelationOneToOne<UserProfile, TeamMembership>;
    userStatuses: RelationOneToOne<UserProfile, string>;
    onExited: () => void;
    channel: Channel;
    teammateNameDisplaySetting: string;

    // skipCommit = true used with onAddCallback will result in users not being committed immediately
    skipCommit?: boolean;

    // onAddCallback takes an array of UserProfiles and should set usersToAdd in state of parent component
    onAddCallback?: (userProfiles?: UserProfileValue[]) => void;

    // Dictionaries of userid mapped users to exclude or include from this list
    excludeUsers?: Record<string, UserProfileValue>;
    includeUsers?: Record<string, UserProfileValue>;
    canInviteGuests?: boolean;
    emailInvitationsEnabled?: boolean;
    groups: Group[];
    isGroupsEnabled: boolean;

    // For RemoTalk plugin
    remotalkPluginEnabled?: boolean;
    hideUsername?: boolean;
    hospitals?: FilterOption[];
    departments?: FilterOption[];
    professions?: FilterOption[];
    staffSummaries?: {[key: string]: StaffSummary};
    filteredUserIds?: string[];

    actions: {
        addUsersToChannel: (channelId: string, userIds: string[]) => Promise<ActionResult>;
        getProfilesNotInChannel: (teamId: string, channelId: string, groupConstrained: boolean, page: number, perPage?: number) => Promise<ActionResult>;
        getProfilesInChannel: (channelId: string, page: number, perPage: number, sort: string, options: {active?: boolean}) => Promise<ActionResult>;
        getTeamStats: (teamId: string) => void;
        loadStatusesForProfilesList: (users: UserProfile[]) => void;
        searchProfiles: (term: string, options: any) => Promise<ActionResult>;
        closeModal: (modalId: string) => void;
        searchAssociatedGroupsForReference: (prefix: string, teamId: string, channelId: string | undefined, opts: GroupSearchParams) => Promise<ActionResult>;
        getTeamMembersByIds: (teamId: string, userIds: string[]) => Promise<ActionResult>;

        // For RemoTalk plugin
        getStaffSummaries?: (userIds: string[]) => Promise<ActionResult>;
        searchFilteredUserIds?: (params: FilterParams) => Promise<ActionResult<string[]>>;
    };
}

type State = {
    selectedUsers: UserProfileValue[];
    groupAndUserOptions: Array<UserProfileValue | GroupValue>;
    usersNotInTeam: UserProfileValue[];
    guestsNotInTeam: UserProfileValue[];
    term: string;
    show: boolean;
    saving: boolean;
    loadingUsers: boolean;
    inviteError?: string;

    // For RemoTalk plugin
    filterParams: {[key: string]: number | undefined};
}

const UsernameSpan = styled.span`
    fontSize: 12px;
`;

const UserMappingSpan = styled.span`
    position: absolute;
    right: 20px;
`;

export class ChannelInviteModal extends React.PureComponent<Props, State> {
    private searchTimeoutId = 0;
    private selectedItemRef = React.createRef<HTMLDivElement>();

    public static defaultProps = {
        includeUsers: {},
        excludeUsers: {},
        skipCommit: false,
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedUsers: [],
            usersNotInTeam: [],
            guestsNotInTeam: [],
            term: '',
            show: true,
            saving: false,
            loadingUsers: true,
            groupAndUserOptions: [],

            // For RemoTalk plugin
            filterParams: {hospital_id: 0, department_id: 0, profession_id: 0},
        } as State;
    }

    isUser = (option: UserProfileValue | GroupValue): option is UserProfileValue => {
        return (option as UserProfile).username !== undefined;
    };

    private addValue = (value: UserProfileValue | GroupValue): void => {
        if (this.isUser(value)) {
            const profile = value;
            if (!this.props.membersInTeam || !this.props.membersInTeam[profile.id]) {
                if (isGuest(profile.roles)) {
                    if (this.state.guestsNotInTeam.indexOf(profile) === -1) {
                        this.setState((prevState) => {
                            return {guestsNotInTeam: [...prevState.guestsNotInTeam, profile]};
                        });
                    }
                    return;
                }
                if (this.state.usersNotInTeam.indexOf(profile) === -1) {
                    this.setState((prevState) => {
                        return {usersNotInTeam: [...prevState.usersNotInTeam, profile]};
                    });
                }
                return;
            }

            if (this.state.selectedUsers.indexOf(profile) === -1) {
                this.setState((prevState) => {
                    return {selectedUsers: [...prevState.selectedUsers, profile]};
                });
            }
        }
    };

    private removeInvitedUsers = (profiles: UserProfile[]): void => {
        const usersNotInTeam = this.state.usersNotInTeam.filter((profile) => {
            const user = profile as UserProfileValue;

            const index = profiles.indexOf(user);
            if (index === -1) {
                return true;
            }
            this.addValue(user);
            return false;
        });

        this.setState({usersNotInTeam: [...usersNotInTeam], guestsNotInTeam: []});
    };

    private removeUsersFromValuesNotInTeam = (profiles: UserProfile[]): void => {
        const usersNotInTeam = this.state.usersNotInTeam.filter((profile) => {
            const index = profiles.indexOf(profile);
            return index === -1;
        });
        this.setState({usersNotInTeam: [...usersNotInTeam], guestsNotInTeam: []});
    };

    public componentDidMount(): void {
        this.props.actions.getProfilesNotInChannel(this.props.channel.team_id, this.props.channel.id, this.props.channel.group_constrained, 0).then(() => {
            this.setUsersLoadingState(false);
        });
        this.props.actions.getProfilesInChannel(this.props.channel.id, 0, USERS_PER_PAGE, '', {active: true});
        this.props.actions.getTeamStats(this.props.channel.team_id);
        this.props.actions.loadStatusesForProfilesList(this.props.profilesNotInCurrentChannel);
        this.props.actions.loadStatusesForProfilesList(this.props.profilesInCurrentChannel);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async componentDidUpdate(prevProps: Props, prevState: State) {
        const values = this.getOptions();
        const userIds: string[] = [];

        for (let index = 0; index < values.length; index++) {
            const newValue = values[index];
            if (this.isUser(newValue)) {
                userIds.push(newValue.id);
            } else if (newValue.member_ids) {
                userIds.push(...newValue.member_ids);
            }
        }

        if (!isEqual(values, this.state.groupAndUserOptions)) {
            if (userIds.length > 0) {
                this.props.actions.getTeamMembersByIds(this.props.channel.team_id, userIds);

                // For RemoTalk plugin
                if (this.props.remotalkPluginEnabled) {
                    this.loadStaffSummaries(userIds);
                }
            }
            this.setState({groupAndUserOptions: values});
        }
    }

    getExcludedUsers = (): Set<string> => {
        if (this.props.excludeUsers) {
            return new Set(...this.props.profilesNotInCurrentTeam.map((user) => user.id), Object.values(this.props.excludeUsers).map((user) => user.id));
        }
        return new Set(this.props.profilesNotInCurrentTeam.map((user) => user.id));
    };

    // Options list prioritizes recent dms for the first 10 users and then the next 15 are a mix of users and groups
    public getOptions = () => {
        const excludedAndNotInTeamUserIds = this.getExcludedUsers();

        const filteredDmUsers = filterProfilesMatchingWithTerm(this.props.profilesFromRecentDMs, this.state.term);
        const dmUsers = this.filterOutDeletedAndExcludedAndNotInTeamUsers(filteredDmUsers, excludedAndNotInTeamUserIds).slice(0, USERS_FROM_DMS) as UserProfileValue[];

        let users: UserProfileValue[];
        const filteredUsers: UserProfile[] = filterProfilesMatchingWithTerm(this.props.profilesNotInCurrentChannel.concat(this.props.profilesInCurrentChannel), this.state.term);
        users = this.filterOutDeletedAndExcludedAndNotInTeamUsers(filteredUsers, excludedAndNotInTeamUserIds);
        if (this.props.includeUsers) {
            users = [...users, ...Object.values(this.props.includeUsers)];
        }

        const groupsAndUsers = [
            ...filterGroupsMatchingTerm(this.props.groups, this.state.term) as GroupValue[],
            ...users,
        ].sort(sortUsersAndGroups);

        // For RemoTalk plugin
        if (this.isStaffFilterApplied(this.state.filterParams) && this.props.filteredUserIds) {
            const ids = this.props.filteredUserIds;
            const filteredOptions = [
                ...dmUsers,
                ...groupsAndUsers,
            ].filter((x) => ids.includes(x.id)).slice(0, MAX_USERS);
            return Array.from(new Set(filteredOptions));
        }

        const optionValues = [
            ...dmUsers,
            ...groupsAndUsers,
        ].slice(0, MAX_USERS);

        return Array.from(new Set(optionValues));
    };

    public onHide = (): void => {
        this.setState({show: false});
        this.props.actions.loadStatusesForProfilesList(this.props.profilesNotInCurrentChannel);
        this.props.actions.loadStatusesForProfilesList(this.props.profilesInCurrentChannel);
    };

    public handleInviteError = (err: any): void => {
        if (err) {
            this.setState({
                saving: false,
                inviteError: err.message,
            });
        }
    };

    private handleDelete = (values: Array<UserProfileValue | GroupValue>): void => {
        // Our values for this component are always UserProfileValue
        const profiles = values as UserProfileValue[];
        this.setState({selectedUsers: profiles});
    };

    private setUsersLoadingState = (loadingState: boolean): void => {
        this.setState({
            loadingUsers: loadingState,
        });
    };

    private handlePageChange = (page: number, prevPage: number): void => {
        if (page > prevPage) {
            this.setUsersLoadingState(true);
            this.props.actions.getProfilesNotInChannel(
                this.props.channel.team_id,
                this.props.channel.id,
                this.props.channel.group_constrained,
                page + 1, USERS_PER_PAGE).then(() => this.setUsersLoadingState(false));

            this.props.actions.getProfilesInChannel(this.props.channel.id, page + 1, USERS_PER_PAGE, '', {active: true});
        }
    };

    public handleSubmit = (): void => {
        const {actions, channel} = this.props;

        const userIds = this.state.selectedUsers.map((u) => u.id);
        if (userIds.length === 0) {
            return;
        }

        if (this.props.skipCommit && this.props.onAddCallback) {
            this.props.onAddCallback(this.state.selectedUsers);
            this.setState({
                saving: false,
                inviteError: undefined,
            });
            this.onHide();
            return;
        }

        this.setState({saving: true});

        actions.addUsersToChannel(channel.id, userIds).then((result) => {
            if (result.error) {
                this.handleInviteError(result.error);
            } else {
                this.setState({
                    saving: false,
                    inviteError: undefined,
                });
                this.onHide();
            }
        });
    };

    public search = (searchTerm: string, filterParams?: {[key: string]: number | undefined}): void => {
        const term = searchTerm.trim();
        const params = {
            hospital_id: filterParams?.hospital_id,
            department_id: filterParams?.department_id,
            profession_id: filterParams?.profession_id,
        };
        clearTimeout(this.searchTimeoutId);
        this.setState({
            term,
            filterParams: params,
        });
        this.setUsersLoadingState(true);

        this.searchTimeoutId = window.setTimeout(
            async () => {
                if (!term && !this.isStaffFilterApplied(params)) {
                    this.setUsersLoadingState(false);
                    return;
                }

                let userIds: string[] | undefined;
                if (this.props.actions.searchFilteredUserIds && this.isStaffFilterApplied(params)) {
                    const {data} = await this.props.actions.searchFilteredUserIds(params);
                    userIds = data;
                }

                const options = {
                    team_id: this.props.channel.team_id,
                    not_in_channel_id: this.props.channel.id,
                    group_constrained: this.props.channel.group_constrained,
                    user_ids: userIds && userIds.length > 0 ? userIds : undefined,
                };

                const opts = {
                    q: term,
                    filter_allow_reference: true,
                    page: 0,
                    per_page: 100,
                    include_member_count: true,
                    include_member_ids: true,
                };
                const promises = [
                    this.props.actions.searchProfiles(term, options),
                ];
                if (this.props.isGroupsEnabled) {
                    promises.push(this.props.actions.searchAssociatedGroupsForReference(term, this.props.channel.team_id, this.props.channel.id, opts));
                }
                await Promise.all(promises);
                this.setUsersLoadingState(false);
            },
            Constants.SEARCH_TIMEOUT_MILLISECONDS,
        );
    };

    private renderAriaLabel = (option: UserProfileValue | GroupValue): string => {
        if (!option) {
            return '';
        }
        if (this.isUser(option)) {
            return option.username;
        }
        return option.name;
    };

    private filterOutDeletedAndExcludedAndNotInTeamUsers = (users: UserProfile[], excludeUserIds: Set<string>): UserProfileValue[] => {
        return users.filter((user) => {
            return user.delete_at === 0 && !excludeUserIds.has(user.id);
        }) as UserProfileValue[];
    };

    // For RemoTalk plugin
    private getStaffSummaryText = (userId: string) => {
        if (!this.props.staffSummaries) {
            return null;
        }
        const summary = this.props.staffSummaries[userId];
        if (!summary) {
            return '';
        }
        const infoToShow = [
            summary.hospital,
            summary.department,
            summary.profession,
        ].filter((x) => Boolean(x));
        if (infoToShow.length === 0) {
            return '';
        }
        return ` (${infoToShow.join(' / ')}) `;
    };

    // For RemoTalk plugin
    private getTenantFilterOptions = () => {
        const result: {[key: string]: FilterOption[]} = {};
        if (this.props.hospitals && this.props.hospitals.length > 1) {
            const label = localizeMessage('remotalk.channel_invite.hospital.select', 'Select Hospital');
            result.hospital_id = [{value: 0, label}].concat(this.props.hospitals);
        }
        if (this.props.departments && this.props.departments.length > 1) {
            const label = localizeMessage('remotalk.channel_invite.department.select', 'Select Department');
            result.department_id = [{value: 0, label}].concat(this.props.departments);
        }
        if (this.props.professions && this.props.professions.length > 1) {
            const label = localizeMessage('remotalk.channel_invite.profession.select', 'Select Profession');
            result.profession_id = [{value: 0, label}].concat(this.props.professions);
        }
        return result;
    };

    // For RemoTalk plugin
    private loadStaffSummaries = async (userIds: string[]) => {
        if (!this.props.actions.getStaffSummaries) {
            return;
        }
        const idsToFetch = userIds.filter((x) => Boolean(!this.props.staffSummaries || !this.props.staffSummaries[x]));
        if (idsToFetch.length === 0) {
            return;
        }
        await this.props.actions.getStaffSummaries(idsToFetch);
    };

    // For RemoTalk plugin
    private isStaffFilterApplied = (params: {[key: string]: number | undefined}) => {
        return Object.values(params).some((x) => Boolean(x));
    };

    renderOption = (option: UserProfileValue | GroupValue, isSelected: boolean, onAdd: (option: UserProfileValue | GroupValue) => void, onMouseMove: (option: UserProfileValue | GroupValue) => void) => {
        let rowSelected = '';
        if (isSelected) {
            rowSelected = 'more-modal__row--selected';
        }

        if (this.isUser(option)) {
            const ProfilesInGroup = this.props.profilesInCurrentChannel.map((user) => user.id);

            const userMapping: Record<string, string> = {};
            for (let i = 0; i < ProfilesInGroup.length; i++) {
                userMapping[ProfilesInGroup[i]] = 'Already in channel';
            }
            const displayName = displayUsername(option, this.props.teammateNameDisplaySetting);

            // For RemoTalk plugin
            const staffSummary = this.getStaffSummaryText(option.id);
            return (
                <div
                    key={option.id}
                    ref={isSelected ? this.selectedItemRef : option.id}
                    className={'more-modal__row clickable ' + rowSelected}
                    onClick={() => onAdd(option)}
                    onMouseMove={() => onMouseMove(option)}
                >
                    <ProfilePicture
                        src={Client4.getProfilePictureUrl(option.id, option.last_picture_update)}
                        status={this.props.userStatuses[option.id]}
                        size='md'
                        username={option.username}
                    />
                    <div className='more-modal__details'>
                        <div className='more-modal__name'>
                            <span>
                                {displayName}
                                {staffSummary}
                                {option.is_bot && <BotTag/>}
                                {isGuest(option.roles) && <GuestTag className='popoverlist'/>}
                                {displayName === option.username || this.props.hideUsername ? null : <UsernameSpan className='ml-2 light'>{'@'}{option.username}</UsernameSpan>}
                                <UserMappingSpan
                                    className='light'
                                >
                                    {userMapping[option.id]}
                                </UserMappingSpan>
                            </span>
                        </div>
                    </div>
                    <div className='more-modal__actions'>
                        <div className='more-modal__actions--round'>
                            <i
                                className='icon icon-plus'
                            />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <GroupOption
                group={option}
                key={option.id}
                addUserProfile={onAdd}
                isSelected={isSelected}
                rowSelected={rowSelected}
                onMouseMove={onMouseMove}
                selectedItemRef={this.selectedItemRef}
            />
        );
    };

    public render = (): JSX.Element => {
        let inviteError = null;
        if (this.state.inviteError) {
            inviteError = (<label className='has-error control-label'>{this.state.inviteError}</label>);
        }

        const buttonSubmitText = localizeMessage('multiselect.add', 'Add');
        const buttonSubmitLoadingText = localizeMessage('multiselect.adding', 'Adding...');

        const closeMembersInviteModal = () => {
            this.props.actions.closeModal(ModalIdentifiers.CHANNEL_INVITE);
        };

        const InviteModalLink = (props: {inviteAsGuest?: boolean; children: React.ReactNode}) => {
            return (
                <ToggleModalButton
                    id='inviteGuest'
                    className={`${props.inviteAsGuest ? 'invite-as-guest' : ''} btn btn-link`}
                    modalId={ModalIdentifiers.INVITATION}
                    dialogType={InvitationModal}
                    dialogProps={{
                        channelToInvite: this.props.channel,
                        initialValue: this.state.term,
                        inviteAsGuest: props.inviteAsGuest,
                    }}
                    onClick={closeMembersInviteModal}
                >
                    {props.children}
                </ToggleModalButton>
            );
        };

        const customNoOptionsMessage = (
            <div className='custom-no-options-message'>
                <FormattedMessage
                    id='channel_invite.no_options_message'
                    defaultMessage='No matches found - <InvitationModalLink>Invite them to the team</InvitationModalLink>'
                    values={{
                        InvitationModalLink: (chunks: string) => (
                            <InviteModalLink>
                                {chunks}
                            </InviteModalLink>
                        ),
                    }}
                />
            </div>
        );

        const content = (
            <MultiSelect
                key='addUsersToChannelKey'
                options={this.state.groupAndUserOptions}
                optionRenderer={this.renderOption}
                intl={this.props.intl}
                selectedItemRef={this.selectedItemRef}
                values={this.state.selectedUsers}
                ariaLabelRenderer={this.renderAriaLabel}
                saveButtonPosition={'bottom'}
                perPage={USERS_PER_PAGE}
                handlePageChange={this.handlePageChange}
                handleInput={(term) => this.search(term, this.state.filterParams)}
                handleDelete={this.handleDelete}
                handleAdd={this.addValue}
                handleSubmit={this.handleSubmit}
                handleCancel={closeMembersInviteModal}
                buttonSubmitText={buttonSubmitText}
                buttonSubmitLoadingText={buttonSubmitLoadingText}
                saving={this.state.saving}
                loading={this.state.loadingUsers}
                placeholderText={this.props.isGroupsEnabled ? localizeMessage('multiselect.placeholder.peopleOrGroups', 'Search for people or groups') : localizeMessage('multiselect.placeholder', 'Search for people')}
                valueWithImage={true}
                backButtonText={localizeMessage('multiselect.cancel', 'Cancel')}
                backButtonClick={closeMembersInviteModal}
                backButtonClass={'btn-tertiary tertiary-button'}
                customNoOptionsMessage={this.props.emailInvitationsEnabled ? customNoOptionsMessage : null}

                // For RemoTalk plugin
                customFilterOptions={this.getTenantFilterOptions()}
                customFilterValue={this.state.filterParams}
                handleCustomFilterChange={async (params) => this.search(this.state.term, params)}
                customFilterStyle={{padding: '0.5rem 3.2rem'}}
            />
        );

        const inviteGuestLink = (
            <InviteModalLink inviteAsGuest={true}>
                <FormattedMessage
                    id='channel_invite.invite_guest'
                    defaultMessage='Invite as a Guest'
                />
            </InviteModalLink>
        );

        return (
            <Modal
                id='addUsersToChannelModal'
                dialogClassName='a11y__modal channel-invite'
                show={this.state.show}
                onHide={this.onHide}
                onExited={this.props.onExited}
                role='dialog'
                aria-labelledby='channelInviteModalLabel'
            >
                <Modal.Header
                    id='channelInviteModalLabel'
                    closeButton={true}
                >
                    <Modal.Title
                        componentClass='h1'
                        id='deletePostModalLabel'
                    >
                        <FormattedMessage
                            id='channel_invite.addNewMembers'
                            defaultMessage='Add people to {channel}'
                            values={{
                                channel: this.props.channel.display_name,
                            }}
                        />
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body
                    role='application'
                    className='overflow--visible'
                >
                    {inviteError}
                    <div className='channel-invite__content'>
                        {content}
                        <TeamWarningBanner
                            guests={this.state.guestsNotInTeam}
                            teamId={this.props.channel.team_id}
                            users={this.state.usersNotInTeam}
                        />
                        {(this.props.emailInvitationsEnabled && this.props.canInviteGuests) && inviteGuestLink}
                    </div>
                </Modal.Body>
            </Modal>
        );
    };
}

export default injectIntl(ChannelInviteModal);
