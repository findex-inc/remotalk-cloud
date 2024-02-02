// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {UserProfile} from '@mattermost/types/users';

import {searchGroupChannels} from 'mattermost-redux/actions/channels';
import {getStaffSummaries, searchFilteredUserIds} from 'mattermost-redux/actions/integrations';
import {
    getProfiles,
    getProfilesInTeam,
    getTotalUsersStats,
    searchProfiles,
} from 'mattermost-redux/actions/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getCurrentTeam} from 'mattermost-redux/selectors/entities/teams';
import {
    getCurrentUserId,
    getProfiles as selectProfiles,
    getProfilesInCurrentChannel,
    getProfilesInCurrentTeam,
    makeSearchProfilesStartingWithTerm,
    searchProfilesInCurrentTeam,
    getTotalUsersStats as getTotalUsersStatsSelector,
} from 'mattermost-redux/selectors/entities/users';

import {openDirectChannelToUserId, openGroupChannelToUserIds} from 'actions/channel_actions';
import {loadStatusesForProfilesList, loadProfilesMissingStatus} from 'actions/status_actions';
import {loadProfilesForGroupChannels} from 'actions/user_actions';
import {setModalSearchTerm} from 'actions/views/search';
import {getDepartments, getHospitals, getProfessions, isRemoTalkPluginEnabled, selectStaffSummaries} from 'selectors/plugins';

import type {GlobalState} from 'types/store';

import MoreDirectChannels from './more_direct_channels';

type OwnProps = {
    isExistingChannel: boolean;
}

const makeMapStateToProps = () => {
    const searchProfilesStartingWithTerm = makeSearchProfilesStartingWithTerm();

    return (state: GlobalState, ownProps: OwnProps) => {
        const currentUserId = getCurrentUserId(state);
        let currentChannelMembers;
        if (ownProps.isExistingChannel) {
            currentChannelMembers = getProfilesInCurrentChannel(state);
        }

        const config = getConfig(state);
        const restrictDirectMessage = config.RestrictDirectMessage;

        const searchTerm = state.views.search.modalSearch;

        let users: UserProfile[];
        if (searchTerm) {
            if (restrictDirectMessage === 'any') {
                users = searchProfilesStartingWithTerm(state, searchTerm, false);
            } else {
                users = searchProfilesInCurrentTeam(state, searchTerm, false);
            }
        } else if (restrictDirectMessage === 'any') {
            users = selectProfiles(state);
        } else {
            users = getProfilesInCurrentTeam(state);
        }

        const team = getCurrentTeam(state);
        const stats = getTotalUsersStatsSelector(state) || {total_users_count: 0};

        // For RemoTalk plugin
        const remotalkPluginEnabled = isRemoTalkPluginEnabled(state);
        const staffSummaries = selectStaffSummaries(state);
        const hospitals = getHospitals(state).map((x) => ({value: x.id, label: x.name}));
        const departments = getDepartments(state).map((x) => ({value: x.id, label: x.name}));
        const professions = getProfessions(state).map((x) => ({value: x.id, label: x.name}));

        return {
            currentTeamId: team.id,
            currentTeamName: team.name,
            searchTerm,
            users,
            currentChannelMembers,
            currentUserId,
            restrictDirectMessage,
            totalCount: stats.total_users_count,

            // For RemoTalk plugin
            remotalkPluginEnabled,
            staffSummaries,
            hospitals,
            departments,
            professions,
        };
    };
};

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            getProfiles,
            getProfilesInTeam,
            loadProfilesMissingStatus,
            getTotalUsersStats,
            loadStatusesForProfilesList,
            loadProfilesForGroupChannels,
            openDirectChannelToUserId,
            openGroupChannelToUserIds,
            searchProfiles,
            searchGroupChannels,
            setModalSearchTerm,

            // For RemoTalk plugin
            getStaffSummaries,
            searchFilteredUserIds,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(MoreDirectChannels);
