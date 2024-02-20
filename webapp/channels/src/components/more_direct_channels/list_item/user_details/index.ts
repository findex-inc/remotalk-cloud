// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import type {UserProfile} from '@mattermost/types/users';

import {getCurrentUserId, getStatusForUserId} from 'mattermost-redux/selectors/entities/users';

import {getHideUsername, isRemoTalkPluginEnabled, selectStaffSummaries} from 'selectors/plugins';

import type {GlobalState} from 'types/store';

import UserDetails from './user_details';

type OwnProps = {
    option: UserProfile;
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    return {
        currentUserId: getCurrentUserId(state),
        status: getStatusForUserId(state, ownProps.option.id),

        // For RemoTalk plugin
        remotalkPluginEnabled: isRemoTalkPluginEnabled(state),
        staffSummaries: selectStaffSummaries(state),
        hideUsername: getHideUsername(state),
    };
}

export default connect(mapStateToProps)(UserDetails);
