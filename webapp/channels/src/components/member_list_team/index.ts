// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {IntlShape} from 'react-intl';
import {injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {getStaffSummaries, searchFilteredUserIds} from 'mattermost-redux/actions/integrations';
import {getTeamStats, getTeamMembers} from 'mattermost-redux/actions/teams';
import {searchProfiles} from 'mattermost-redux/actions/users';
import {Permissions} from 'mattermost-redux/constants';
import {haveITeamPermission} from 'mattermost-redux/selectors/entities/roles';
import {getMembersInCurrentTeam, getCurrentTeamStats} from 'mattermost-redux/selectors/entities/teams';
import {getProfilesInCurrentTeam, searchProfilesInCurrentTeam} from 'mattermost-redux/selectors/entities/users';

import {loadStatusesForProfilesList} from 'actions/status_actions';
import {loadProfilesAndTeamMembers, loadTeamMembersForProfilesList} from 'actions/user_actions';
import {setModalSearchTerm} from 'actions/views/search';
import {isRemoTalkPluginEnabled, selectStaffSummaries, getHospitals, getDepartments, getProfessions, getFilteredUserIds} from 'selectors/plugins';

import type {GlobalState} from 'types/store';

import MemberListTeam from './member_list_team';

type Props = {
    teamId: string;
    intl: IntlShape;
}

function mapStateToProps(state: GlobalState, ownProps: Props) {
    const canManageTeamMembers = haveITeamPermission(state, ownProps.teamId, Permissions.MANAGE_TEAM_ROLES);

    const searchTerm = state.views.search.modalSearch;

    let users;
    if (searchTerm) {
        users = searchProfilesInCurrentTeam(state, searchTerm);
    } else {
        users = getProfilesInCurrentTeam(state);
    }

    const stats = getCurrentTeamStats(state) || {active_member_count: 0};

    // For RemoTalk plugin
    const remotalkPluginEnabled = isRemoTalkPluginEnabled(state);
    const staffSummaries = selectStaffSummaries(state);
    const hospitals = getHospitals(state).map((x) => ({value: x.id, label: x.name}));
    const departments = getDepartments(state).map((x) => ({value: x.id, label: x.name}));
    const professions = getProfessions(state).map((x) => ({value: x.id, label: x.name}));
    const filteredUserIds = getFilteredUserIds(state);

    return {
        searchTerm,
        users,
        teamMembers: getMembersInCurrentTeam(state) || {},
        currentTeamId: state.entities.teams.currentTeamId,
        totalTeamMembers: stats.active_member_count,
        canManageTeamMembers,

        // For RemoTalk plugin
        intl: ownProps.intl,
        remotalkPluginEnabled,
        staffSummaries,
        hospitals,
        departments,
        professions,
        filteredUserIds,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            searchProfiles,
            getTeamStats,
            getTeamMembers,
            loadProfilesAndTeamMembers,
            loadStatusesForProfilesList,
            loadTeamMembersForProfilesList,
            setModalSearchTerm,

            // For RemoTalk plugin
            getStaffSummaries,
            searchFilteredUserIds,
        }, dispatch),
    };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(MemberListTeam);
export default injectIntl(connected);
