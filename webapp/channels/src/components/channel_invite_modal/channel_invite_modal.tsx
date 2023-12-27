// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isEqual} from 'lodash';
import React from 'react';
import {Modal} from 'react-bootstrap';
import {FormattedMessage} from 'react-intl';
import type {ValueType} from 'react-select';
import ReactSelect from 'react-select'; // For RemoTalk plugin
import styled from 'styled-components';

import type {Channel} from '@mattermost/types/channels';
import type {Group, GroupSearchParams} from '@mattermost/types/groups';
import type {TeamMembership} from '@mattermost/types/teams';
import type {UserProfile} from '@mattermost/types/users';
import type {RelationOneToOne} from '@mattermost/types/utilities';

import {Client4} from 'mattermost-redux/client';
import type {ActionResult} from 'mattermost-redux/types/actions';
import {filterGroupsMatchingTerm} from 'mattermost-redux/utils/group_utils';
import {displayUsername, filterProfilesStartingWithTerm, isGuest} from 'mattermost-redux/utils/user_utils';

import InvitationModal from 'components/invitation_modal';
import MultiSelect from 'components/multiselect/multiselect';
import type {Value} from 'components/multiselect/multiselect';
import ProfilePicture from 'components/profile_picture';
import ToggleModalButton from 'components/toggle_modal_button';
import AddIcon from 'components/widgets/icons/fa_add_icon';
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
const FILTER_KEYS = ['hospital_id', 'department_id', 'profession_id'] as const;
type FilterKey = typeof FILTER_KEYS[number];
type FilterOption = {value: number; label: string};
type StaffSummary = {
    user_id: string;
    hospital?: string;
    department?: string;
    profession?: string;
};

type UserProfileValue = Value & UserProfile;

type GroupValue = Value & Group;

export type Props = {
    profilesNotInCurrentChannel: UserProfile[];
    profilesInCurrentChannel: UserProfile[];
    profilesNotInCurrentTeam: UserProfile[];
    profilesFromRecentDMs: UserProfile[];
    membersInTeam: RelationOneToOne<UserProfile, TeamMembership>;
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
    remotalkPluginEnabled: boolean;
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
    hospitals: FilterOption[];
    departments: FilterOption[];
    professions: FilterOption[];
    filterParams: {[key in FilterKey]?: number};
    filteredUserIds: string[];
    staffSummaries: {[key: string]: StaffSummary};
}

const UsernameSpan = styled.span`
    fontSize: 12px;
`;

const UserMappingSpan = styled.span`
    position: absolute;
    right: 20px;
`;

export default class ChannelInviteModal extends React.PureComponent<Props, State> {
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
            hospitals: [],
            departments: [],
            professions: [],
            filterParams: {},
            filteredUserIds: [],
            staffSummaries: {},
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

        // For RemoTalk plugin
        if (this.props.remotalkPluginEnabled) {
            this.loadPulldownOptions();
        }
    }

    public async componentDidUpdate(prevProps: Props, prevState: State) {
        if (prevState.term !== this.state.term) {
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
                    this.loadStaffSummaries(userIds);
                }
                this.setState({groupAndUserOptions: values});
            }
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

        const filteredDmUsers = filterProfilesStartingWithTerm(this.props.profilesFromRecentDMs, this.state.term);
        const dmUsers = this.filterOutDeletedAndExcludedAndNotInTeamUsers(filteredDmUsers, excludedAndNotInTeamUserIds).slice(0, USERS_FROM_DMS) as UserProfileValue[];

        let users: UserProfileValue[];
        const filteredUsers: UserProfile[] = filterProfilesStartingWithTerm(this.props.profilesNotInCurrentChannel.concat(this.props.profilesInCurrentChannel), this.state.term);
        users = this.filterOutDeletedAndExcludedAndNotInTeamUsers(filteredUsers, excludedAndNotInTeamUserIds);
        if (this.props.includeUsers) {
            users = [...users, ...Object.values(this.props.includeUsers)];
        }
        const groupsAndUsers = [
            ...filterGroupsMatchingTerm(this.props.groups, this.state.term) as GroupValue[],
            ...users,
        ].sort(sortUsersAndGroups);

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

        actions.addUsersToChannel(channel.id, userIds).then((result: any) => {
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

    public search = (searchTerm: string): void => {
        const term = searchTerm.trim();
        clearTimeout(this.searchTimeoutId);
        this.setState({
            term,
        });

        this.searchTimeoutId = window.setTimeout(
            async () => {
                if (!term) {
                    return;
                }

                const options = {
                    team_id: this.props.channel.team_id,
                    not_in_channel_id: this.props.channel.id,
                    group_constrained: this.props.channel.group_constrained,
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
        const summary = this.state.staffSummaries[userId];
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
                                {displayName === option.username ? null : <UsernameSpan className='ml-2 light'>{'@'}{option.username}</UsernameSpan>}
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
                            <AddIcon/>
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

    // For RemoTalk plugin
    private loadPulldownOptions = async () => {
        const [hospitals, departments, professions] = await Promise.all([
            Client4.getHospitals().then((res) => res.map((x) => ({value: x.id, label: x.short_name ? x.short_name : x.name}))),
            Client4.getDepartments().then((res) => res.map((x) => ({value: x.id, label: x.short_name ? x.short_name : x.name}))),
            Client4.getProfessions().then((res) => res.map((x) => ({value: x.id, label: x.name}))),
        ]);
        this.setState({
            hospitals: [{
                value: 0,
                label: localizeMessage('remotalk.channel_invite.hospital.empty', 'Hospital - empty'),
            }].concat(hospitals),
            departments: [{
                value: 0,
                label: localizeMessage('remotalk.channel_invite.department.empty', 'Department - empty'),
            }].concat(departments),
            professions: [{
                value: 0,
                label: localizeMessage('remotalk.channel_invite.profession.empty', 'Profession - empty'),
            }].concat(professions),
        });
    };

    // For RemoTalk plugin
    private loadStaffSummaries = async (userIds: string[]) => {
        const current = this.state.staffSummaries;
        const idsToFetch = userIds.filter((x) => Boolean(!current[x]));
        if (idsToFetch.length === 0) {
            return;
        }
        const result = await Client4.getStaffSummaries(idsToFetch);
        this.setState({
            staffSummaries: {...current, ...result},
        });
    };

    // For RemoTalk plugin
    private onFilterChange = async (val: ValueType<FilterOption>, key: FilterKey) => {
        const id = val && 'value' in val ? val.value : undefined;
        const params = {...this.state.filterParams, [key]: id};
        let filtered: string[] = [];
        if (Object.values(params).some((x) => Boolean(x))) {
            filtered = await Client4.searchFilteredUserIds(params);
        }
        this.setState({
            filterParams: params,
            filteredUserIds: filtered,
        });
    };

    // For RemoTalk plugin
    private renderFilter = (options: FilterOption[], params: {[key in FilterKey]?: number}, key: FilterKey) => {
        if (options.length < 3) {
            return null;
        }
        const found = options.find((x) => x.value === params[key]);
        return (
            <div
                style={{padding: '0.5rem 2.4rem'}}
                key={key}
            >
                <ReactSelect
                    value={found}
                    options={options}
                    onChange={(val) => this.onFilterChange(val, key)}
                    styles={{
                        menuPortal: (provided) => ({...provided, zIndex: 9999}),
                        menu: (provided) => ({...provided, zIndex: 9999}),
                    }}
                />
            </div>
        );
    };

    public render = (): JSX.Element => {
        let inviteError = null;
        if (this.state.inviteError) {
            inviteError = (<label className='has-error control-label'>{this.state.inviteError}</label>);
        }

        const header = (
            <h1>
                <FormattedMessage
                    id='channel_invite.addNewMembers'
                    defaultMessage='Add people to {channel}'
                    values={{
                        channel: this.props.channel.display_name,
                    }}
                />
            </h1>
        );

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

        // For RemoTalk plugin
        const filteredUserList = this.state.groupAndUserOptions.
            filter((x) => !this.state.filteredUserIds.length || this.state.filteredUserIds.includes(x.id));
        const content = (
            <MultiSelect
                key='addUsersToChannelKey'
                options={filteredUserList}
                optionRenderer={this.renderOption}
                selectedItemRef={this.selectedItemRef}
                values={this.state.selectedUsers}
                ariaLabelRenderer={this.renderAriaLabel}
                saveButtonPosition={'bottom'}
                perPage={USERS_PER_PAGE}
                handlePageChange={this.handlePageChange}
                handleInput={this.search}
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

        // For RemoTalk plugin
        const filters = [
            this.state.hospitals,
            this.state.departments,
            this.state.professions,
        ].map((o, i) => this.renderFilter(o, this.state.filterParams, FILTER_KEYS[i])).filter((f) => Boolean(f));

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
                />
                <Modal.Body
                    role='application'
                    className='overflow--visible'
                >
                    <div className='channel-invite__header'>
                        {header}
                    </div>
                    {inviteError}
                    {/* For RemoTalk plugin */}
                    {filters.length ? <div>{filters}</div> : null}
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
