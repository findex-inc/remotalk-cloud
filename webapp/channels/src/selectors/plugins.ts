// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AppBinding} from '@mattermost/types/apps';

import {Preferences, Permissions} from 'mattermost-redux/constants';
import {createSelector} from 'mattermost-redux/selectors/create_selector';
import {appBarEnabled, getAppBarAppBindings} from 'mattermost-redux/selectors/entities/apps';
import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {get} from 'mattermost-redux/selectors/entities/preferences';
import {haveICurrentChannelPermission} from 'mattermost-redux/selectors/entities/roles';
import {getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {createShallowSelector} from 'mattermost-redux/utils/helpers';
import {includesAnAdminRole, isChannelAdmin, isTeamAdmin} from 'mattermost-redux/utils/user_utils';

import Constants from 'utils/constants';

import type {GlobalState} from 'types/store';
import type {FileDropdownPluginComponent, PluginComponent} from 'types/store/plugins';

export const getPluginUserSettings = createSelector(
    'getPluginUserSettings',
    (state: GlobalState) => state.plugins.userSettings,
    (settings) => {
        return settings || {};
    },
);

export const getFilesDropdownPluginMenuItems = createSelector(
    'getFilesDropdownPluginMenuItems',
    (state: GlobalState) => state.plugins.components.FilesDropdown,
    (components) => {
        return (components || []) as unknown as FileDropdownPluginComponent[];
    },
);

export const getUserGuideDropdownPluginMenuItems = createSelector(
    'getUserGuideDropdownPluginMenuItems',
    (state: GlobalState) => state.plugins.components.UserGuideDropdown,
    (components) => {
        return components;
    },
);

export const getChannelHeaderPluginComponents = createSelector(
    'getChannelHeaderPluginComponents',
    (state: GlobalState) => appBarEnabled(state),
    (state: GlobalState) => state.plugins.components.ChannelHeaderButton,
    (state: GlobalState) => state.plugins.components.AppBar,
    (enabled, channelHeaderComponents = [], appBarComponents = []) => {
        if (!enabled || !appBarComponents.length) {
            return channelHeaderComponents as unknown as PluginComponent[];
        }

        // Remove channel header icons for plugins that have also registered an app bar component
        const appBarPluginIds = appBarComponents.map((appBarComponent) => appBarComponent.pluginId);
        return channelHeaderComponents.filter((channelHeaderComponent) => !appBarPluginIds.includes(channelHeaderComponent.pluginId));
    },
);

const getChannelHeaderMenuPluginComponentsShouldRender = createSelector(
    'getChannelHeaderMenuPluginComponentsShouldRender',
    (state: GlobalState) => state,
    (state: GlobalState) => state.plugins.components.ChannelHeader,
    (state, channelHeaderMenuComponents = []) => {
        return channelHeaderMenuComponents.map((component) => {
            if (typeof component.shouldRender === 'function') {
                return component.shouldRender(state);
            }

            return true;
        });
    },
);

export const getChannelHeaderMenuPluginComponents = createShallowSelector(
    'getChannelHeaderMenuPluginComponents',
    getChannelHeaderMenuPluginComponentsShouldRender,
    (state: GlobalState) => state.plugins.components.ChannelHeader,
    (componentShouldRender = [], channelHeaderMenuComponents = []) => {
        return channelHeaderMenuComponents.filter((component, idx) => componentShouldRender[idx]);
    },
);

export const getChannelIntroPluginButtons = createSelector(
    'getChannelIntroPluginButtons',
    (state: GlobalState) => state.plugins.components.ChannelIntroButton,
    (components = []) => {
        return components;
    },
);

export const getAppBarPluginComponents = createSelector(
    'getAppBarPluginComponents',
    (state: GlobalState) => state.plugins.components.AppBar,
    (components = []) => {
        return components;
    },
);

export const shouldShowAppBar = createSelector(
    'shouldShowAppBar',
    appBarEnabled,
    getAppBarAppBindings,
    getAppBarPluginComponents,
    getChannelHeaderPluginComponents,
    (enabled: boolean, bindings: AppBinding[], appBarComponents: PluginComponent[], channelHeaderComponents) => {
        return enabled && Boolean(bindings.length || appBarComponents.length || channelHeaderComponents.length);
    },
);

export function showNewChannelWithBoardPulsatingDot(state: GlobalState): boolean {
    const pulsatingDotState = get(state, Preferences.APP_BAR, Preferences.NEW_CHANNEL_WITH_BOARD_TOUR_SHOWED, '');
    const showPulsatingDot = pulsatingDotState !== '' && JSON.parse(pulsatingDotState)[Preferences.NEW_CHANNEL_WITH_BOARD_TOUR_SHOWED] === false;
    return showPulsatingDot;
}

// For RemoTalk plugin

const remotalkPluginId = 'jp.co.findex.remotalk-plugin';

export function isRemoTalkPluginEnabled(s: GlobalState) {
    return Boolean(s.plugins.plugins[remotalkPluginId]);
}

export function getRemoTalkPluginState(s: any) {
    return s[`plugins-${remotalkPluginId}`];
}

export const getRemoTalkPluginConfig = createSelector(
    'getRemoTalkPluginConfig',
    getRemoTalkPluginState,
    (s) => s?.config,
);

export const securitySettingsInvisible = createSelector(
    'securitySettingsInvisible',
    isRemoTalkPluginEnabled,
    getRemoTalkPluginConfig,
    (enabled, config) => Boolean(enabled && config?.DisableManuallyChangeSecuritySettings),
);

export const postToTownSquareDisabled = createSelector(
    'postToTownSquareDisabled',
    isRemoTalkPluginEnabled,
    getRemoTalkPluginConfig,
    (enabled, config) => Boolean(enabled && config?.DisablePostToTownSquare),
);

export const canCreatePost = createSelector(
    'canCreatePost',
    (s: GlobalState) => haveICurrentChannelPermission(s, Permissions.CREATE_POST),
    (s: GlobalState) => {
        const roles = getCurrentUserRoles(s);
        return includesAnAdminRole(roles) || isTeamAdmin(roles) || isChannelAdmin(roles);
    },
    (s: GlobalState) => getCurrentChannel(s)?.name === Constants.DEFAULT_CHANNEL,
    postToTownSquareDisabled,
    (isPermitted, isAdmin, isDefaultChannel, disabled) => {
        if (!isPermitted) {
            return false;
        }
        if (!isDefaultChannel || isAdmin || !disabled) {
            return true;
        }
        return false;
    },
);

export const getUserProfileItemsToHide = createSelector(
    'getUserProfileItemsToHide',
    isRemoTalkPluginEnabled,
    getRemoTalkPluginConfig,
    (enabled, config) => {
        if (!enabled || !config?.ProfileItemsToDisableManualChange) {
            return [];
        }
        const str = config.ProfileItemsToDisableManualChange;
        if (typeof str !== 'string') {
            return [];
        }
        return str.split(',').map((x) => x.trim());
    },
);
