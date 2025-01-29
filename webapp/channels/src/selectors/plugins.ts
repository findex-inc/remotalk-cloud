// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AppBinding} from '@mattermost/types/apps';

import {Preferences} from 'mattermost-redux/constants';
import {createSelector} from 'mattermost-redux/selectors/create_selector';
import {appBarEnabled, getAppBarAppBindings} from 'mattermost-redux/selectors/entities/apps';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {get} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {createShallowSelector} from 'mattermost-redux/utils/helpers';
import {includesAnAdminRole, isChannelAdmin, isTeamAdmin} from 'mattermost-redux/utils/user_utils';

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
    (s) => s?.config as any,
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

export const canCreatePostToTownSquare = createSelector(
    'canCreatePostToTownSquare',
    (s: GlobalState) => {
        const roles = getCurrentUserRoles(s);
        return includesAnAdminRole(roles) || isTeamAdmin(roles) || isChannelAdmin(roles);
    },
    postToTownSquareDisabled,
    (isAdmin, disabled) => (isAdmin || !disabled),
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

export const getHideUsername = createSelector(
    'getHideUsername',
    isRemoTalkPluginEnabled,
    getRemoTalkPluginConfig,
    (enabled, config) => Boolean(enabled && config?.HideUsername),
);

export const isUsingTenantManagementService = createSelector(
    'isUsingTenantManagementService',
    getRemoTalkPluginConfig,
    (config) => Boolean(config?.UseTenantManagementService),
);

export function getTenantInfo(s: any) {
    const tenant = getRemoTalkPluginState(s)?.tenant;
    if (!tenant) {
        return undefined;
    }
    const {
        hospitals,
        hospitalOrder,
        departments,
        departmentOrder,
        professions,
        professionOrder,
    } = tenant;
    return {
        hospitals: typeof hospitals === 'object' ? hospitals : undefined,
        hospitalOrder: Array.isArray(hospitalOrder) ? hospitalOrder : undefined,
        departments: typeof departments === 'object' ? departments : undefined,
        departmentOrder: Array.isArray(departmentOrder) ? departmentOrder : undefined,
        professions: typeof professions === 'object' ? professions : undefined,
        professionOrder: Array.isArray(professionOrder) ? professionOrder : undefined,
    };
}

export const getHospitals = createSelector(
    'getHospitals',
    getTenantInfo,
    (t) => {
        if (!t || !t.hospitals) {
            return [];
        }
        const order = t.hospitalOrder;
        if (order && order.length === Object.keys(t.hospitals).length) {
            return order.map((id) => t.hospitals[id] as {id: number; name: string; sort?: number});
        }
        return Object.values(t.hospitals).
            map((x) => x as {id: number; name: string; sort?: number}).
            sort((a, b) => (a.sort ?? a.id) - (b.sort ?? b.id));
    },
);

export const getDepartments = createSelector(
    'getDepartments',
    getTenantInfo,
    (t) => {
        if (!t || !t.departments) {
            return [];
        }
        const order = t.departmentOrder;
        if (order && order.length === Object.keys(t.departments).length) {
            return order.map((id) => t.departments[id] as {id: number; name: string; sort?: number});
        }
        return Object.values(t.departments).
            map((x) => x as {id: number; name: string; sort?: number}).
            sort((a, b) => (a.sort ?? a.id) - (b.sort ?? b.id));
    },
);

export const getProfessions = createSelector(
    'getProfessions',
    getTenantInfo,
    (t) => {
        if (!t || !t.professions) {
            return [];
        }
        const order = t.professionOrder;
        if (order && order.length === Object.keys(t.professions).length) {
            return order.map((id) => t.professions[id] as {id: number; name: string; sort?: number});
        }
        return Object.values(t.professions).
            map((x) => x as {id: number; name: string; sort?: number}).
            sort((a, b) => (a.sort ?? a.id) - (b.sort ?? b.id));
    },
);

export const selectStaffSummaries = createSelector(
    'selectStaffSummaries',
    (s: any) => getRemoTalkPluginState(s)?.staffs,
    getTenantInfo,
    (staffs, tenant) => {
        const result: {[key: string]: {hospital?: string; department?: string; profession?: string}} = {};
        if (!staffs || typeof staffs !== 'object') {
            return result;
        }
        const userIds = Object.keys(staffs);
        if (!tenant) {
            for (const id of userIds) {
                result[id] = {};
            }
            return result;
        }
        const {hospitals, departments, professions} = tenant;
        for (const id of userIds) {
            const s = staffs[id];
            const h = hospitals && s.hospital ? hospitals[s.hospital.toString()] : undefined;
            const d = departments && s.department ? departments[s.department.toString()] : undefined;
            const p = professions && s.profession ? professions[s.profession.toString()] : undefined;
            result[id] = {
                hospital: h?.name,
                department: d?.name,
                profession: p?.name,
            };
        }
        return result;
    },
);

export const getFilterInfo = createSelector(
    'getFilterInfo',
    (s: any) => getRemoTalkPluginState(s),
    (s) => s?.filter,
);

export const getFilteredUserIds = createSelector(
    'getFilteredUserIds',
    getFilterInfo,
    (info) => {
        const result = info?.userIds;
        if (!result || !Array.isArray(result)) {
            return [] as string[];
        }
        return result as string[];
    },
);

export const getStaffFilterParams = createSelector(
    'getStaffFilterParams',
    getFilterInfo,
    (info) => {
        const appliedParams = info?.applied;
        if (!appliedParams) {
            return {
                hospital_id: undefined,
                department_id: undefined,
                profession_id: undefined,
            };
        }
        const {
            hospital_id: hosp,
            department_id: dept,
            profession_id: prof,
        } = appliedParams;
        return {
            hospital_id: typeof hosp === 'number' ? hosp : undefined,
            department_id: typeof dept === 'number' ? dept : undefined,
            profession_id: typeof prof === 'number' ? prof : undefined,
        };
    },
);

export const getIsFilterApplied = createSelector(
    'getIsFilterApplied',
    getStaffFilterParams,
    (params) => Object.values(params).some((x) => Boolean(x)),
);

export const getMyInfo = createSelector(
    'getMyInfo',
    (s: any) => getRemoTalkPluginState(s)?.myInfo,
    (info) => {
        if (!info) {
            return undefined;
        }
        const {
            authId,
            startAt,
            endAt,
            phone,
            hospitals,
            departments,
            professions,
        } = info;
        return {
            authId: typeof authId === 'number' ? authId : 0,
            startAt: typeof startAt === 'number' ? startAt : 0,
            endAt: typeof endAt === 'number' ? endAt : 0,
            phone: typeof phone === 'string' ? phone : '',
            hospitals: typeof hospitals === 'object' ? hospitals : undefined,
            departments: typeof departments === 'object' ? departments : undefined,
            professions: typeof professions === 'object' ? professions : undefined,
        };
    },
);

export const getMyPhoneNumber = createSelector(
    'getMyPhoneNumber',
    getMyInfo,
    (info) => info?.phone ?? '',
);

export const getMyHospitalIds = createSelector(
    'getMyHospitalIds',
    getMyInfo,
    (info) => {
        if (!info) {
            return [];
        }
        const {hospitals} = info;
        if (!hospitals) {
            return [];
        }
        return Object.keys(hospitals).
            map((x) => Number.parseInt(x, 10)).
            filter((x) => x && !Number.isNaN(x));
    },
);

export const getMyDepartmentIds = createSelector(
    'getMyDepartmentIds',
    getMyInfo,
    (info) => {
        if (!info) {
            return [];
        }
        const {departments} = info;
        if (!departments) {
            return [];
        }
        return Object.keys(departments).
            map((x) => Number.parseInt(x, 10)).
            filter((x) => x && !Number.isNaN(x));
    },
);

export const getMyProfessionIds = createSelector(
    'getMyProfessionIds',
    getMyInfo,
    (info) => {
        if (!info) {
            return [];
        }
        const {professions} = info;
        if (!professions) {
            return [];
        }
        return Object.keys(professions).
            map((x) => Number.parseInt(x, 10)).
            filter((x) => x && !Number.isNaN(x));
    },
);

export const getMyAuthId = createSelector(
    'getMyAuthId',
    getMyInfo,
    (info) => info?.authId ?? 0,
);

export const currentChannelAlbumEnabled = createSelector(
    'currentChannelAlbumEnabled',
    getCurrentChannelId,
    getRemoTalkPluginState,
    (id, rtState) => {
        const channelAlbums = rtState?.albums?.channels;
        return Boolean(channelAlbums && channelAlbums[id]);
    },
);
