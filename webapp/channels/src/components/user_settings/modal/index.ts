// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {lazy} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {getUserPreferences} from 'mattermost-redux/actions/preferences';
import {getUser, sendVerificationEmail} from 'mattermost-redux/actions/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getUserPreferences as getUserPreferencesSelector} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUser, getUser as getUserSelector} from 'mattermost-redux/selectors/entities/users';

import {getMyAuthId, getMyDepartmentIds, getMyHospitalIds, getMyPhoneNumber, getMyProfessionIds, getPluginUserSettings, securitySettingsInvisible} from 'selectors/plugins';

import {makeAsyncComponent} from 'components/async_load';

import type {GlobalState} from 'types/store';

const UserSettingsModalAsync = makeAsyncComponent('UserSettingsModal', lazy(() => import('./user_settings_modal')));

import type {OwnProps} from './user_settings_modal';

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const config = getConfig(state);

    const sendEmailNotifications = config.SendEmailNotifications === 'true';
    const requireEmailVerification = config.RequireEmailVerification === 'true';

    // For RemoTalk plugin
    const hideSecurity = securitySettingsInvisible(state);
    const phone = getMyPhoneNumber(state);
    const hospitalIds = getMyHospitalIds(state);
    const departmentIds = getMyDepartmentIds(state);
    const professionIds = getMyProfessionIds(state);
    const authId = getMyAuthId(state);

    const user = ownProps.adminMode && ownProps.userID ? getUserSelector(state, ownProps.userID) : getCurrentUser(state);

    return {
        user,
        userPreferences: ownProps.adminMode && ownProps.userID ? getUserPreferencesSelector(state, ownProps.userID) : undefined,
        sendEmailNotifications,
        requireEmailVerification,
        pluginSettings: getPluginUserSettings(state),
        hideSecurity,
        phone,
        hospitalIds,
        departmentIds,
        professionIds,
        authId,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            sendVerificationEmail,
            getUserPreferences,
            getUser,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(UserSettingsModalAsync);
