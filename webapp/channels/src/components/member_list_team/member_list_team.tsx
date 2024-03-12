// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import type {IntlShape} from 'react-intl';

import type {TeamMembership, TeamStats, GetTeamMembersOpts} from '@mattermost/types/teams';
import type {UserProfile} from '@mattermost/types/users';

import {Teams} from 'mattermost-redux/constants';
import type {ActionResult} from 'mattermost-redux/types/actions';

import SearchableUserList from 'components/searchable_user_list/searchable_user_list_container';
import TeamMembersDropdown from 'components/team_members_dropdown';

import Constants from 'utils/constants';
import * as UserAgent from 'utils/user_agent';

const USERS_PER_PAGE = 50;

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

type Props = {
    searchTerm: string;
    users: UserProfile[];
    teamMembers: {
        [userId: string]: TeamMembership;
    };
    currentTeamId: string;
    totalTeamMembers: number;
    canManageTeamMembers?: boolean;

    // For RemoTalk plugin
    intl?: IntlShape;
    remotalkPluginEnabled?: boolean;
    hospitals?: FilterOption[];
    departments?: FilterOption[];
    professions?: FilterOption[];
    staffSummaries?: {[key: string]: StaffSummary};
    filteredUserIds?: string[];
    filterParams?: FilterParams;
    isFilterApplied?: boolean;

    actions: {
        getTeamMembers: (teamId: string, page?: number, perPage?: number, options?: GetTeamMembersOpts) => Promise<ActionResult<TeamMembership[]>>;
        searchProfiles: (term: string, options?: {[key: string]: any}) => Promise<ActionResult<UserProfile[]>>;
        getTeamStats: (teamId: string) => Promise<ActionResult<TeamStats>>;
        loadProfilesAndTeamMembers: (page: number, perPage: number, teamId: string, options?: {[key: string]: any}) => Promise<ActionResult>;
        loadStatusesForProfilesList: (users: UserProfile[]) => void;
        loadTeamMembersForProfilesList: (profiles: any, teamId: string, reloadAllMembers: boolean) => Promise<ActionResult>;
        setModalSearchTerm: (term: string) => ActionResult;

        // For RemoTalk plugin
        getStaffSummaries?: (userIds: string[]) => Promise<ActionResult>;
        searchFilteredUserIds?: (params: FilterParams) => Promise<ActionResult<string[]>>;
        setStaffFilterParams?: (params: FilterParams) => void;
    };
}

type State = {
    loading: boolean;
}

export default class MemberListTeam extends React.PureComponent<Props, State> {
    private searchTimeoutId: number;

    constructor(props: Props) {
        super(props);

        this.searchTimeoutId = 0;

        this.state = {
            loading: true,
        };
    }

    async componentDidMount() {
        await Promise.all([
            this.props.actions.loadProfilesAndTeamMembers(0, Constants.PROFILE_CHUNK_SIZE, this.props.currentTeamId, {active: true}),
            this.props.actions.getTeamMembers(this.props.currentTeamId, 0, Constants.DEFAULT_MAX_USERS_PER_TEAM,
                {
                    sort: Teams.SORT_USERNAME_OPTION,
                    exclude_deleted_users: true,
                },
            ),
            this.props.actions.getTeamStats(this.props.currentTeamId),
        ]);
        this.loadComplete();
    }

    componentWillUnmount() {
        this.props.actions.setModalSearchTerm('');
        if (this.props.actions.setStaffFilterParams) {
            this.props.actions.setStaffFilterParams({});
        }
    }

    componentDidUpdate(prevProps: Props) {
        if (prevProps.searchTerm !== this.props.searchTerm || !this.equalFilter(prevProps.filterParams, this.props.filterParams)) {
            clearTimeout(this.searchTimeoutId);

            const params = this.props.filterParams;
            const searchTerm = this.props.searchTerm;
            if (searchTerm === '' && !this.props.isFilterApplied) {
                this.loadComplete();
                this.searchTimeoutId = 0;
                return;
            }

            const searchTimeoutId = window.setTimeout(
                async () => {
                    const {
                        loadStatusesForProfilesList,
                        loadTeamMembersForProfilesList,
                        searchProfiles,
                        searchFilteredUserIds,
                    } = this.props.actions;

                    // For RemoTalk plugin
                    let userIds: string[] | undefined;
                    if (searchFilteredUserIds && params) {
                        const {data} = await searchFilteredUserIds(params);
                        userIds = data;
                    }
                    const {data} = await searchProfiles(searchTerm, {
                        team_id: this.props.currentTeamId,
                        user_ids: userIds && userIds.length > 0 ? userIds : undefined,
                    });

                    if (searchTimeoutId !== this.searchTimeoutId) {
                        return;
                    }

                    this.setState({loading: true});

                    loadStatusesForProfilesList(data!);
                    loadTeamMembersForProfilesList(data, this.props.currentTeamId, true).then(({data: membersLoaded}) => {
                        if (membersLoaded) {
                            this.loadComplete();
                        }
                    });
                },
                Constants.SEARCH_TIMEOUT_MILLISECONDS,
            );

            this.searchTimeoutId = searchTimeoutId;
        }

        // For RemoTalk plugin
        this.loadStaffSummaries();
    }

    loadComplete = () => {
        this.setState({loading: false});
    };

    nextPage = async (page: number) => {
        this.setState({loading: true});
        await Promise.all([
            this.props.actions.loadProfilesAndTeamMembers(page, USERS_PER_PAGE, this.props.currentTeamId, {active: true}),
            this.props.actions.getTeamMembers(this.props.currentTeamId, page, Constants.DEFAULT_MAX_USERS_PER_TEAM,
                {
                    sort: Teams.SORT_USERNAME_OPTION,
                    exclude_deleted_users: true,
                } as GetTeamMembersOpts,
            ),
        ]);
        this.loadComplete();
    };

    search = (term: string) => {
        this.props.actions.setModalSearchTerm(term);
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
        if (!this.props.actions.getStaffSummaries) {
            return;
        }
        const {users} = this.props;
        if (!this.props.remotalkPluginEnabled || !users) {
            return;
        }
        const idsToFetch = users.map((x) => x.id).filter((x) => Boolean(!this.props.staffSummaries || !this.props.staffSummaries[x]));
        if (idsToFetch.length === 0) {
            return;
        }
        await this.props.actions.getStaffSummaries(idsToFetch);
    };

    // For RemoTalk plugin
    private onFilterChange = async (value: {[key: string]: number | undefined}) => {
        if (!this.props.actions.setStaffFilterParams) {
            return;
        }
        this.props.actions.setStaffFilterParams({
            hospital_id: value.hospital_id,
            department_id: value.department_id,
            profession_id: value.profession_id,
        });
    };

    // For RemoTalk plugin
    private hitTenantFilter = (user: UserProfile) => {
        return !this.props.isFilterApplied || !this.props.filteredUserIds || this.props.filteredUserIds.includes(user.id);
    };

    // For RemoTalk plugin
    private equalFilter = (
        a: {[key: string]: number | undefined} | undefined,
        b: {[key: string]: number | undefined} | undefined,
    ) => {
        if (!a || !b) {
            return !a && !b;
        }
        return Object.keys(a).every((k) => a[k] === b[k]);
    };

    render() {
        let teamMembersDropdown;
        if (this.props.canManageTeamMembers) {
            teamMembersDropdown = [TeamMembersDropdown];
        }

        const teamMembers = this.props.teamMembers;
        const users = this.props.users;
        const actionUserProps: {
            [userId: string]: {
                teamMember: TeamMembership;
            };
        } = {};

        let usersToDisplay;
        if (this.state.loading) {
            usersToDisplay = null;
        } else {
            usersToDisplay = [];

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                if (teamMembers[user.id] && user.delete_at === 0 && this.hitTenantFilter(user)) {
                    usersToDisplay.push(user);
                    actionUserProps[user.id] = {
                        teamMember: teamMembers[user.id],
                    };
                }
            }
        }

        // For RemoTalk plugin
        const extraInfo: {[key: string]: string[]} = {};
        if (this.props.staffSummaries && this.props.remotalkPluginEnabled) {
            for (const [key, summary] of Object.entries(this.props.staffSummaries)) {
                const info = [summary.hospital, summary.department, summary.profession].filter((x) => Boolean(x));
                extraInfo[key] = [info.join(' / ')];
            }
        }

        return (
            <SearchableUserList
                users={usersToDisplay}
                usersPerPage={USERS_PER_PAGE}
                total={this.props.totalTeamMembers}
                nextPage={this.nextPage}
                search={this.search}
                actions={teamMembersDropdown}
                actionUserProps={actionUserProps}
                focusOnMount={!UserAgent.isMobile()}

                // For RemoTalk plugin
                customFilterOptions={this.getTenantFilterOptions()}
                customFilterValue={this.props.filterParams}
                handleCustomFilterChange={this.onFilterChange}
                customFilterStyle={{marginBottom: '0.5rem'}}
                extraInfo={extraInfo}
            />
        );
    }
}
