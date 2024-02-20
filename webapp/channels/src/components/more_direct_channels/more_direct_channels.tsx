// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from 'lodash';
import React from 'react';
import {Modal} from 'react-bootstrap';
import {FormattedMessage} from 'react-intl';
import type {IntlShape} from 'react-intl';

import type {Channel} from '@mattermost/types/channels';
import type {UserProfile} from '@mattermost/types/users';

import type {ActionResult} from 'mattermost-redux/types/actions';

import type MultiSelect from 'components/multiselect/multiselect';

import {getHistory} from 'utils/browser_history';
import Constants from 'utils/constants';

import List from './list';
import {USERS_PER_PAGE} from './list/list';
import {
    isGroupChannel,
    optionValue,
} from './types';
import type {
    OptionValue} from './types';

// For RemoTalk plugin
type FilterOption = {value: number; label: string};
type StaffSummary = {
    hospital?: string;
    department?: string;
    profession?: string;
};
type FilterParams = {
    hospital_id: number | undefined;
    department_id: number | undefined;
    profession_id: number | undefined;
}

export type Props = {
    currentUserId: string;
    currentTeamId: string;
    currentTeamName: string;
    searchTerm: string;
    users: UserProfile[];
    totalCount: number;

    /*
    * List of current channel members of existing channel
    */
    currentChannelMembers?: UserProfile[];

    /*
    * Whether the modal is for existing channel or not
    */
    isExistingChannel: boolean;

    /*
    * The mode by which direct messages are restricted, if at all.
    */
    restrictDirectMessage?: string;
    onModalDismissed?: () => void;
    onExited?: () => void;

    // For RemoTalk plugin
    intl?: IntlShape;
    remotalkPluginEnabled?: boolean;
    hospitals?: FilterOption[];
    departments?: FilterOption[];
    professions?: FilterOption[];
    staffSummaries?: {[key: string]: StaffSummary};

    actions: {
        getProfiles: (page?: number | undefined, perPage?: number | undefined, options?: any) => Promise<ActionResult>;
        getProfilesInTeam: (teamId: string, page: number, perPage?: number | undefined, sort?: string | undefined, options?: any) => Promise<ActionResult<UserProfile[]>>;
        loadProfilesMissingStatus: (users: UserProfile[]) => void;
        getTotalUsersStats: () => void;
        loadStatusesForProfilesList: (users: UserProfile[]) => void;
        loadProfilesForGroupChannels: (groupChannels: Channel[]) => void;
        openDirectChannelToUserId: (userId: string) => Promise<ActionResult>;
        openGroupChannelToUserIds: (userIds: string[]) => Promise<ActionResult>;
        searchProfiles: (term: string, options: any) => Promise<ActionResult<UserProfile[]>>;
        searchGroupChannels: (term: string) => Promise<ActionResult<Channel[]>>;
        setModalSearchTerm: (term: string) => void;

        // For RemoTalk plugin
        getStaffSummaries?: (userIds: string[]) => Promise<ActionResult>;
        searchFilteredUserIds?: (params: FilterParams) => Promise<ActionResult<string[]>>;
    };
}

type State = {
    values: OptionValue[];
    show: boolean;
    search: boolean;
    saving: boolean;
    loadingUsers: boolean;

    // For RemoTalk plugin
    filterParams: {[key: string]: number | undefined};
    filteredUserIds: string[];
}

export default class MoreDirectChannels extends React.PureComponent<Props, State> {
    searchTimeoutId: any;
    exitToChannel?: string;
    multiselect: React.RefObject<MultiSelect<OptionValue>>;
    selectedItemRef: React.RefObject<HTMLDivElement>;
    constructor(props: Props) {
        super(props);

        this.searchTimeoutId = 0;
        this.multiselect = React.createRef();
        this.selectedItemRef = React.createRef();

        const values: OptionValue[] = [];

        if (props.currentChannelMembers) {
            for (let i = 0; i < props.currentChannelMembers.length; i++) {
                const user = Object.assign({}, props.currentChannelMembers[i]);

                if (user.id === props.currentUserId) {
                    continue;
                }

                values.push(optionValue(user));
            }
        }

        this.state = {
            values,
            show: true,
            search: false,
            saving: false,
            loadingUsers: true,

            // For RemoTalk plugin
            filterParams: {hospital_id: 0, department_id: 0, profession_id: 0},
            filteredUserIds: [],
        };
    }

    loadModalData = () => {
        this.getUserProfiles();
        this.props.actions.getTotalUsersStats();
        this.props.actions.loadProfilesMissingStatus(this.props.users);
    };

    updateFromProps(prevProps: Props) {
        if (prevProps.searchTerm !== this.props.searchTerm) {
            clearTimeout(this.searchTimeoutId);

            const searchTerm = this.props.searchTerm;
            if (searchTerm === '') {
                this.resetPaging();
            } else {
                const teamId = this.props.restrictDirectMessage === 'any' ? '' : this.props.currentTeamId;

                this.searchTimeoutId = setTimeout(
                    async () => {
                        this.setUsersLoadingState(true);
                        const [{data: profilesData}, {data: groupChannelsData}] = await Promise.all([
                            this.props.actions.searchProfiles(searchTerm, {team_id: teamId}),
                            this.props.actions.searchGroupChannels(searchTerm),
                        ]);
                        if (profilesData) {
                            this.props.actions.loadStatusesForProfilesList(profilesData);
                        }
                        if (groupChannelsData) {
                            this.props.actions.loadProfilesForGroupChannels(groupChannelsData);
                        }
                        this.resetPaging();
                        this.setUsersLoadingState(false);
                    },
                    Constants.SEARCH_TIMEOUT_MILLISECONDS,
                );
            }
        }

        if (
            prevProps.users.length !== this.props.users.length
        ) {
            this.props.actions.loadProfilesMissingStatus(this.props.users);

            // For RemoTalk plugin
            this.loadStaffSummaries();
        }
    }

    componentDidUpdate(prevProps: Props) {
        this.updateFromProps(prevProps);
    }

    handleHide = () => {
        this.props.actions.setModalSearchTerm('');
        this.setState({show: false});
    };

    setUsersLoadingState = (loadingState: boolean) => {
        this.setState({
            loadingUsers: loadingState,
        });
    };

    handleExit = () => {
        if (this.exitToChannel) {
            getHistory().push(this.exitToChannel);
        }

        this.props.onModalDismissed?.();
        this.props.onExited?.();
    };

    handleSubmit = (values = this.state.values) => {
        const {actions} = this.props;
        if (this.state.saving) {
            return;
        }

        const userIds = values.map((v) => v.id);
        if (userIds.length === 0) {
            return;
        }

        this.setState({saving: true});

        const done = (result: any) => {
            const {data, error} = result;
            this.setState({saving: false});

            if (!error) {
                this.exitToChannel = '/' + this.props.currentTeamName + '/channels/' + data.name;
                this.handleHide();
            }
        };

        if (userIds.length === 1) {
            actions.openDirectChannelToUserId(userIds[0]).then(done);
        } else {
            actions.openGroupChannelToUserIds(userIds).then(done);
        }
    };

    addValue = (value: OptionValue) => {
        if (isGroupChannel(value)) {
            this.addUsers(value.profiles);
        } else {
            const values = Object.assign([], this.state.values);

            if (values.indexOf(value) === -1) {
                values.push(value);
            }

            this.setState({values});
        }
    };

    addUsers = (users: UserProfile[]) => {
        const values: OptionValue[] = Object.assign([], this.state.values);
        const existingUserIds = values.map((user) => user.id);
        for (const user of users) {
            if (existingUserIds.indexOf(user.id) !== -1) {
                continue;
            }
            values.push(optionValue(user));
        }

        this.setState({values});
    };

    getUserProfiles = (page?: number) => {
        const pageNum = page ? page + 1 : 0;
        if (this.props.restrictDirectMessage === 'any') {
            this.props.actions.getProfiles(pageNum, USERS_PER_PAGE * 2).then(() => {
                this.setUsersLoadingState(false);
            });
        } else {
            this.props.actions.getProfilesInTeam(this.props.currentTeamId, pageNum, USERS_PER_PAGE * 2).then(() => {
                this.setUsersLoadingState(false);
            });
        }
    };

    handlePageChange = (page: number, prevPage: number) => {
        if (page > prevPage) {
            this.setUsersLoadingState(true);
            this.getUserProfiles(page);
        }
    };

    resetPaging = () => {
        this.multiselect.current?.resetPaging();
    };

    search = debounce((term: string) => {
        this.props.actions.setModalSearchTerm(term);
    }, 250);

    handleDelete = (values: OptionValue[]) => {
        this.setState({values});
    };

    // For RemoTalk plugin
    private getTenantFilterOptions = () => {
        const result: {[key: string]: FilterOption[]} = {};
        if (this.props.hospitals && this.props.hospitals.length > 1) {
            const label = this.props.intl ? this.props.intl.formatMessage({id: 'remotalk.channel_invite.hospital.select', defaultMessage: 'Select Hospital'}) : 'Select Hospital';
            result.hospital_id = [{value: 0, label}].concat(this.props.hospitals);
        }
        if (this.props.departments && this.props.departments.length > 1) {
            const label = this.props.intl ? this.props.intl.formatMessage({id: 'remotalk.channel_invite.department.select', defaultMessage: 'Select Department'}) : 'Select Department';
            result.department_id = [{value: 0, label}].concat(this.props.departments);
        }
        if (this.props.professions && this.props.professions.length > 1) {
            const label = this.props.intl ? this.props.intl.formatMessage({id: 'remotalk.channel_invite.profession.select', defaultMessage: 'Select Profession'}) : 'Select Profession';
            result.profession_id = [{value: 0, label}].concat(this.props.professions);
        }
        return result;
    };

    // For RemoTalk plugin
    private loadStaffSummaries = async () => {
        if (!this.props.remotalkPluginEnabled || !this.props.actions.getStaffSummaries) {
            return;
        }
        const {users} = this.props;
        const idsToFetch = users.map((x) => x.id).filter((x) => Boolean(!this.props.staffSummaries || !this.props.staffSummaries[x]));
        if (idsToFetch.length === 0) {
            return;
        }
        await this.props.actions.getStaffSummaries(idsToFetch);
    };

    // For RemoTalk plugin
    private onFilterChange = async (value: {[key: string]: number | undefined}) => {
        if (!this.props.actions.searchFilteredUserIds) {
            return;
        }
        const params = {
            hospital_id: value.hospital_id,
            department_id: value.department_id,
            profession_id: value.profession_id,
        };
        const result = await this.props.actions.searchFilteredUserIds(params);
        this.setState({
            filterParams: params,
            filteredUserIds: result.data ?? [],
        });
    };

    // For RemoTalk plugin
    private hitTenantFilter = (user: UserProfile) => {
        return Object.values(this.state.filterParams).every((x) => !x) ||
            this.state.filteredUserIds.includes(user.id);
    };

    render() {
        // For RemoTalk plugin
        const filteredUsers = this.props.users.filter((x) => this.hitTenantFilter(x));
        const body = (
            <List
                addValue={this.addValue}
                currentUserId={this.props.currentUserId}
                handleDelete={this.handleDelete}
                handlePageChange={this.handlePageChange}
                handleSubmit={this.handleSubmit}
                isExistingChannel={this.props.isExistingChannel}
                loading={this.state.loadingUsers}
                saving={this.state.saving}
                search={this.search}
                selectedItemRef={this.selectedItemRef}
                totalCount={this.props.totalCount}
                users={filteredUsers}
                values={this.state.values}

                // For RemoTalk plugin
                customFilterOptions={this.getTenantFilterOptions()}
                customFilterValue={this.state.filterParams}
                handleCustomFilterChange={this.onFilterChange}
            />
        );

        return (
            <Modal
                dialogClassName='a11y__modal more-modal more-direct-channels'
                show={this.state.show}
                onHide={this.handleHide}
                onExited={this.handleExit}
                onEntered={this.loadModalData}
                role='dialog'
                aria-labelledby='moreDmModalLabel'
                id='moreDmModal'
            >
                <Modal.Header closeButton={true}>
                    <Modal.Title
                        componentClass='h1'
                        id='moreDmModalLabel'
                    >
                        <FormattedMessage
                            id='more_direct_channels.title'
                            defaultMessage='Direct Messages'
                        />
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body
                    role='application'
                >
                    {body}
                </Modal.Body>
                <Modal.Footer className='modal-footer--invisible'>
                    <button
                        id='closeModalButton'
                        type='button'
                        className='btn btn-tertiary'
                    >
                        <FormattedMessage
                            id='general_button.close'
                            defaultMessage='Close'
                        />
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

