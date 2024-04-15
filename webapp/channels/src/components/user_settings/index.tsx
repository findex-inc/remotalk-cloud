// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import type {UserProfile} from '@mattermost/types/users';

import type {PluginConfiguration} from 'types/plugins/user_settings';

import AdvancedTab from './advanced';
import DisplayTab from './display';
import GeneralTab from './general';
import NotificationsTab from './notifications';
import PluginTab from './plugin';
import SecurityTab from './security';
import SidebarTab from './sidebar';

export type Props = {
    user: UserProfile;
    activeTab?: string;
    activeSection: string;
    updateSection: (section?: string) => void;
    updateTab: (notifications: string) => void;
    closeModal: () => void;
    collapseModal: () => void;
    setEnforceFocus: () => void;
    setRequireConfirm: () => void;
    pluginSettings: {[tabName: string]: PluginConfiguration};
    phone?: string;
    hospitalIds?: number[];
    departmentIds?: number[];
    professionIds?: number[];
    authId?: number;
};

export default function UserSettings(props: Props) {
    if (props.activeTab === 'profile') {
        return (
            <div>
                <GeneralTab
                    user={props.user}
                    activeSection={props.activeSection}
                    updateSection={props.updateSection}
                    updateTab={props.updateTab}
                    closeModal={props.closeModal}
                    collapseModal={props.collapseModal}
                    phone={props.phone}
                    hospitalIds={props.hospitalIds}
                    departmentIds={props.departmentIds}
                    professionIds={props.professionIds}
                    authId={props.authId}
                />
            </div>
        );
    } else if (props.activeTab === 'security') {
        return (
            <div>
                <SecurityTab
                    user={props.user}
                    activeSection={props.activeSection}
                    updateSection={props.updateSection}
                    closeModal={props.closeModal}
                    collapseModal={props.collapseModal}
                    setRequireConfirm={props.setRequireConfirm}
                />
            </div>
        );
    } else if (props.activeTab === 'notifications') {
        return (
            <div>
                <NotificationsTab
                    user={props.user}
                    activeSection={props.activeSection}
                    updateSection={props.updateSection}
                    closeModal={props.closeModal}
                    collapseModal={props.collapseModal}
                />
            </div>
        );
    } else if (props.activeTab === 'display') {
        return (
            <div>
                <DisplayTab
                    user={props.user}
                    activeSection={props.activeSection}
                    updateSection={props.updateSection}
                    closeModal={props.closeModal}
                    collapseModal={props.collapseModal}
                    setEnforceFocus={props.setEnforceFocus}
                    setRequireConfirm={props.setRequireConfirm}
                />
            </div>
        );
    } else if (props.activeTab === 'sidebar') {
        return (
            <div>
                <SidebarTab
                    activeSection={props.activeSection}
                    updateSection={props.updateSection}
                    closeModal={props.closeModal}
                    collapseModal={props.collapseModal}
                />
            </div>
        );
    } else if (props.activeTab === 'advanced') {
        return (
            <div>
                <AdvancedTab
                    activeSection={props.activeSection}
                    updateSection={props.updateSection}
                    closeModal={props.closeModal}
                    collapseModal={props.collapseModal}
                />
            </div>
        );
    } else if (props.activeTab && props.pluginSettings[props.activeTab]) {
        return (
            <div>
                <PluginTab
                    activeSection={props.activeSection}
                    updateSection={props.updateSection}
                    closeModal={props.closeModal}
                    collapseModal={props.collapseModal}
                    settings={props.pluginSettings[props.activeTab]}
                />
            </div>
        );
    }

    return null;
}
