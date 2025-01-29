// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AnyAction} from 'redux';
import {batchActions} from 'redux-batched-actions';

import type {Command, CommandArgs, DialogSubmission, IncomingWebhook, IncomingWebhooksWithCount, OAuthApp, OutgoingOAuthConnection, OutgoingWebhook, SubmitDialogResponse} from '@mattermost/types/integrations';
import type {UserProfile} from '@mattermost/types/users';

import {IntegrationTypes, UserTypes} from 'mattermost-redux/action_types';
import {Client4} from 'mattermost-redux/client';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import type {ActionFuncAsync} from 'mattermost-redux/types/actions';

import {logError} from './errors';
import {bindClientFunc, forceLogoutIfNecessary} from './helpers';

import {General} from '../constants';

export function createIncomingHook(hook: IncomingWebhook) {
    return bindClientFunc({
        clientFunc: Client4.createIncomingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_INCOMING_HOOK],
        params: [
            hook,
        ],
    });
}

export function getIncomingHook(hookId: string) {
    return bindClientFunc({
        clientFunc: Client4.getIncomingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_INCOMING_HOOK],
        params: [
            hookId,
        ],
    });
}

export function getIncomingHooks(teamId = '', page = 0, perPage: number = General.PAGE_SIZE_DEFAULT, includeTotalCount = false): ActionFuncAsync<IncomingWebhook[] | IncomingWebhooksWithCount> {
    return async (dispatch, getState) => {
        let data;

        try {
            data = await Client4.getIncomingWebhooks(teamId, page, perPage, includeTotalCount);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const isWebhooksWithCount = isIncomingWebhooksWithCount(data);

        const actions: AnyAction[] = [{
            type: IntegrationTypes.RECEIVED_INCOMING_HOOKS,
            data: isWebhooksWithCount ? (data as IncomingWebhooksWithCount).incoming_webhooks : data,
        }];

        if (isWebhooksWithCount) {
            actions.push({
                type: IntegrationTypes.RECEIVED_INCOMING_HOOKS_TOTAL_COUNT,
                data: (data as IncomingWebhooksWithCount).total_count,
            });
        }

        dispatch(batchActions(actions));
        return {data};
    };
}

export function isIncomingWebhooksWithCount(data: any): data is IncomingWebhooksWithCount {
    return typeof data.incoming_webhooks !== 'undefined' &&
        Array.isArray(data.incoming_webhooks) &&
        typeof data.total_count === 'number';
}

export function removeIncomingHook(hookId: string): ActionFuncAsync {
    return async (dispatch, getState) => {
        try {
            await Client4.removeIncomingWebhook(hookId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.DELETED_INCOMING_HOOK,
                data: {id: hookId},
            },
        ]));

        return {data: true};
    };
}

export function updateIncomingHook(hook: IncomingWebhook) {
    return bindClientFunc({
        clientFunc: Client4.updateIncomingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_INCOMING_HOOK],
        params: [
            hook,
        ],
    });
}

export function createOutgoingHook(hook: OutgoingWebhook) {
    return bindClientFunc({
        clientFunc: Client4.createOutgoingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOK],
        params: [
            hook,
        ],
    });
}

export function getOutgoingHook(hookId: string) {
    return bindClientFunc({
        clientFunc: Client4.getOutgoingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOK],
        params: [
            hookId,
        ],
    });
}

export function getOutgoingHooks(channelId = '', teamId = '', page = 0, perPage: number = General.PAGE_SIZE_DEFAULT) {
    return bindClientFunc({
        clientFunc: Client4.getOutgoingWebhooks,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOKS],
        params: [
            channelId,
            teamId,
            page,
            perPage,
        ],
    });
}

export function removeOutgoingHook(hookId: string): ActionFuncAsync {
    return async (dispatch, getState) => {
        try {
            await Client4.removeOutgoingWebhook(hookId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.DELETED_OUTGOING_HOOK,
                data: {id: hookId},
            },
        ]));

        return {data: true};
    };
}

export function updateOutgoingHook(hook: OutgoingWebhook) {
    return bindClientFunc({
        clientFunc: Client4.updateOutgoingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOK],
        params: [
            hook,
        ],
    });
}

export function regenOutgoingHookToken(hookId: string) {
    return bindClientFunc({
        clientFunc: Client4.regenOutgoingHookToken,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOK],
        params: [
            hookId,
        ],
    });
}

export function getCommands(teamId: string) {
    return bindClientFunc({
        clientFunc: Client4.getCommandsList,
        onSuccess: [IntegrationTypes.RECEIVED_COMMANDS],
        params: [
            teamId,
        ],
    });
}

export function getAutocompleteCommands(teamId: string, page = 0, perPage: number = General.PAGE_SIZE_DEFAULT) {
    return bindClientFunc({
        clientFunc: Client4.getAutocompleteCommandsList,
        onSuccess: [IntegrationTypes.RECEIVED_COMMANDS],
        params: [
            teamId,
            page,
            perPage,
        ],
    });
}

export function getCustomTeamCommands(teamId: string) {
    return bindClientFunc({
        clientFunc: Client4.getCustomTeamCommands,
        onSuccess: [IntegrationTypes.RECEIVED_CUSTOM_TEAM_COMMANDS],
        params: [
            teamId,
        ],
    });
}

export function addCommand(command: Command) {
    return bindClientFunc({
        clientFunc: Client4.addCommand,
        onSuccess: [IntegrationTypes.RECEIVED_COMMAND],
        params: [
            command,
        ],
    });
}

export function editCommand(command: Command) {
    return bindClientFunc({
        clientFunc: Client4.editCommand,
        onSuccess: [IntegrationTypes.RECEIVED_COMMAND],
        params: [
            command,
        ],
    });
}

export function executeCommand(command: string, args: CommandArgs) {
    return bindClientFunc({
        clientFunc: Client4.executeCommand,
        params: [
            command,
            args,
        ],
    });
}

export function regenCommandToken(id: string): ActionFuncAsync {
    return async (dispatch, getState) => {
        let res;
        try {
            res = await Client4.regenCommandToken(id);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.RECEIVED_COMMAND_TOKEN,
                data: {
                    id,
                    token: res.token,
                },
            },
        ]));

        return {data: true};
    };
}

export function deleteCommand(id: string): ActionFuncAsync {
    return async (dispatch, getState) => {
        try {
            await Client4.deleteCommand(id);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.DELETED_COMMAND,
                data: {id},
            },
        ]));

        return {data: true};
    };
}

export function addOAuthApp(app: OAuthApp) {
    return bindClientFunc({
        clientFunc: Client4.createOAuthApp,
        onSuccess: [IntegrationTypes.RECEIVED_OAUTH_APP],
        params: [
            app,
        ],
    });
}

export function editOAuthApp(app: OAuthApp) {
    return bindClientFunc({
        clientFunc: Client4.editOAuthApp,
        onSuccess: IntegrationTypes.RECEIVED_OAUTH_APP,
        params: [
            app,
        ],
    });
}

export function getOAuthApps(page = 0, perPage: number = General.PAGE_SIZE_DEFAULT) {
    return bindClientFunc({
        clientFunc: Client4.getOAuthApps,
        onSuccess: [IntegrationTypes.RECEIVED_OAUTH_APPS],
        params: [
            page,
            perPage,
        ],
    });
}

export function getOutgoingOAuthConnections(teamId: string, page = 0, perPage: number = General.PAGE_SIZE_DEFAULT) {
    return bindClientFunc({
        clientFunc: Client4.getOutgoingOAuthConnections,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_OAUTH_CONNECTIONS],
        params: [
            teamId,
            page,
            perPage,
        ],
    });
}

export function getOutgoingOAuthConnectionsForAudience(teamId: string, audience: string, page = 0, perPage: number = General.PAGE_SIZE_DEFAULT) {
    return bindClientFunc({
        clientFunc: Client4.getOutgoingOAuthConnectionsForAudience,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_OAUTH_CONNECTIONS],
        params: [
            teamId,
            audience,
            page,
            perPage,
        ],
    });
}

export function addOutgoingOAuthConnection(teamId: string, connection: OutgoingOAuthConnection) {
    return bindClientFunc({
        clientFunc: Client4.createOutgoingOAuthConnection,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_OAUTH_CONNECTION],
        params: [
            teamId,
            connection,
        ],
    });
}

export function editOutgoingOAuthConnection(teamId: string, connection: OutgoingOAuthConnection) {
    return bindClientFunc({
        clientFunc: Client4.editOutgoingOAuthConnection,
        onSuccess: IntegrationTypes.RECEIVED_OUTGOING_OAUTH_CONNECTION,
        params: [
            teamId,
            connection,
        ],
    });
}

export function getOutgoingOAuthConnection(teamId: string, connectionId: string) {
    return bindClientFunc({
        clientFunc: Client4.getOutgoingOAuthConnection,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_OAUTH_CONNECTION],
        params: [
            teamId,
            connectionId,
        ],
    });
}

export function validateOutgoingOAuthConnection(teamId: string, connection: OutgoingOAuthConnection) {
    return bindClientFunc({
        clientFunc: Client4.validateOutgoingOAuthConnection,
        params: [
            teamId,
            connection,
        ],
    });
}

export function getAppsOAuthAppIDs() {
    return bindClientFunc({
        clientFunc: Client4.getAppsOAuthAppIDs,
        onSuccess: [IntegrationTypes.RECEIVED_APPS_OAUTH_APP_IDS],
    });
}

export function getAppsBotIDs() {
    return bindClientFunc({
        clientFunc: Client4.getAppsBotIDs,
        onSuccess: [IntegrationTypes.RECEIVED_APPS_BOT_IDS],
    });
}

export function getOAuthApp(appId: string) {
    return bindClientFunc({
        clientFunc: Client4.getOAuthApp,
        onSuccess: [IntegrationTypes.RECEIVED_OAUTH_APP],
        params: [
            appId,
        ],
    });
}

export function getAuthorizedOAuthApps(): ActionFuncAsync<OAuthApp[]> {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);

        let data;
        try {
            data = await Client4.getAuthorizedOAuthApps(currentUserId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));

            return {error};
        }

        return {data};
    };
}

export function deauthorizeOAuthApp(clientId: string) {
    return bindClientFunc({
        clientFunc: Client4.deauthorizeOAuthApp,
        params: [clientId],
    });
}

export function deleteOAuthApp(id: string): ActionFuncAsync {
    return async (dispatch, getState) => {
        try {
            await Client4.deleteOAuthApp(id);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.DELETED_OAUTH_APP,
                data: {id},
            },
        ]));

        return {data: true};
    };
}

export function regenOAuthAppSecret(appId: string) {
    return bindClientFunc({
        clientFunc: Client4.regenOAuthAppSecret,
        onSuccess: [IntegrationTypes.RECEIVED_OAUTH_APP],
        params: [
            appId,
        ],
    });
}

export function deleteOutgoingOAuthConnection(id: string): ActionFuncAsync<boolean> {
    return async (dispatch, getState) => {
        try {
            await Client4.deleteOutgoingOAuthConnection(id);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: IntegrationTypes.DELETED_OUTGOING_OAUTH_CONNECTION,
            data: {id},
        });

        return {data: true};
    };
}

export function submitInteractiveDialog(submission: DialogSubmission): ActionFuncAsync<SubmitDialogResponse> {
    return async (dispatch, getState) => {
        const state = getState();
        submission.channel_id = getCurrentChannelId(state);
        submission.team_id = getCurrentTeamId(state);

        let data;
        try {
            data = await Client4.submitInteractiveDialog(submission);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        return {data};
    };
}

// For RemoTalk plugin

const remotalkPluginId = 'jp.co.findex.remotalk-plugin';
const toRTAction = (a: string) => `${remotalkPluginId}.${a}`;

export function getStaffSummaries(userIds: string[]): ActionFuncAsync<{
    [key: string]: {
        user_id: string;
        auth_id?: number;
        hospital?: number;
        department?: number;
        profession?: number;
    };
}> {
    return async (dispatch, getState) => {
        try {
            const data = await Client4.getStaffSummaries(userIds);
            for (const id of userIds) {
                if (data[id]) {
                    continue;
                }
                data[id] = {user_id: id};
            }
            dispatch({
                type: toRTAction('RECEIVED_STAFF_SUMMARIES'),
                data,
            });
            return {data};
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }
    };
}

export function setStaffFilterParams(params: {
    hospital_id?: number | undefined;
    department_id?: number | undefined;
    profession_id?: number | undefined;
}) {
    return {
        type: toRTAction('TENANT_FILTER_APPLIED'),
        data: params,
    };
}

export function searchFilteredUserIds(params: {
    hospital_id?: number | undefined;
    department_id?: number | undefined;
    profession_id?: number | undefined;
}): ActionFuncAsync<string[]> {
    return async (dispatch, getState) => {
        if (Object.values(params).every((x) => !x)) {
            dispatch({
                type: toRTAction('FILTERED_USER_IDS_CHANGED'),
                data: [],
            });
            return {data: []};
        }
        try {
            const data = await Client4.searchFilteredUserIds(params);
            dispatch({
                type: toRTAction('FILTERED_USER_IDS_RECEIVED'),
                data,
            });
            return {data};
        } catch (error) {
            dispatch({
                type: toRTAction('FILTERED_USER_IDS_CHANGED'),
                data: [],
            });
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }
    };
}

export function updateMyFindexUserInfo(user: UserProfile, patch: {
    last_name?: string;
    first_name?: string;
    email?: string;
    phone?: string;
}): ActionFuncAsync {
    return async (dispatch) => {
        dispatch({type: UserTypes.UPDATE_ME_REQUEST, data: null});

        try {
            await Client4.updateMyFindexUserInfo(patch);
        } catch (error) {
            dispatch({type: UserTypes.UPDATE_ME_FAILURE, error});
            dispatch(logError(error));
            return {error};
        }

        const actions: Array<{type: string; data?: any}> = [
            {type: UserTypes.UPDATE_ME_SUCCESS},
        ];
        const data = Object.assign({}, user);
        if (typeof patch.last_name !== 'undefined') {
            data.last_name = patch.last_name;
        }
        if (typeof patch.first_name !== 'undefined') {
            data.first_name = patch.first_name;
        }
        if (typeof patch.email !== 'undefined') {
            data.email = patch.email;
        }
        if (typeof patch.phone !== 'undefined') {
            actions.push({type: toRTAction('UPDATED_STAFF_PHONE'), data: patch.phone});
        }
        actions.push({type: UserTypes.RECEIVED_ME, data});
        dispatch(batchActions(actions));

        return {data: true};
    };
}

export function updateBelongingDepartments(staffId: number, ids: number[]): ActionFuncAsync {
    return async (dispatch) => {
        dispatch({type: UserTypes.UPDATE_ME_REQUEST, data: null});
        const relations = ids.map((id) => ({
            staff_id: staffId,
            department_id: id,
        }));

        let data;
        try {
            data = await Client4.updateBelongingDepartments(relations);
        } catch (error) {
            dispatch({type: UserTypes.UPDATE_ME_FAILURE, error});
            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {type: UserTypes.UPDATE_ME_SUCCESS},
            {type: toRTAction('UPDATED_BELONGING_DEPARTMENTS'), data},
        ]));

        return {data: true};
    };
}

export function updateAssignedProfessions(staffId: number, ids: number[]): ActionFuncAsync {
    return async (dispatch) => {
        dispatch({type: UserTypes.UPDATE_ME_REQUEST, data: null});
        const relations = ids.map((id) => ({
            staff_id: staffId,
            profession_id: id,
        }));

        let data;
        try {
            data = await Client4.updateAssignedProfessions(relations);
        } catch (error) {
            dispatch({type: UserTypes.UPDATE_ME_FAILURE, error});
            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {type: UserTypes.UPDATE_ME_SUCCESS},
            {type: toRTAction('UPDATED_ASSIGNED_PROFESSIONS'), data},
        ]));

        return {data: true};
    };
}

export function getSavedFileInCurrentChannel(fileId: string): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const teamId = getCurrentTeamId(state);
        const channelId = getCurrentChannelId(state);

        try {
            const data = await Client4.getAlbumSavedFileInfo(teamId, channelId, fileId);
            dispatch({type: toRTAction('RECEIVED_SAVED_FILES'), data: [data]});
            return {data: Boolean(data)};
        } catch (error) {
            dispatch({type: toRTAction('ERROR_RECEIVE_SAVED_FILES'), error});
            return {error};
        }
    };
}
