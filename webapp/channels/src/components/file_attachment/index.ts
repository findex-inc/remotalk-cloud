// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import type {ConnectedProps} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {getSavedFileInCurrentChannel} from 'mattermost-redux/actions/integrations';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import {openModal} from 'actions/views/modals';
import {currentChannelAlbumEnabled, getFilesDropdownPluginMenuItems, getSavedFilesMap} from 'selectors/plugins';

import {canDownloadFiles} from 'utils/file_utils';

import type {GlobalState} from 'types/store';

import FileAttachment from './file_attachment';

function mapStateToProps(state: GlobalState) {
    const config = getConfig(state);

    return {
        canDownloadFiles: canDownloadFiles(config),
        enableSVGs: config.EnableSVGs === 'true',
        enablePublicLink: config.EnablePublicLink === 'true',
        pluginMenuItems: getFilesDropdownPluginMenuItems(state),

        // For RemoTalk plugin
        channelAlbumEnabled: currentChannelAlbumEnabled(state),
        savedFilesMap: getSavedFilesMap(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            openModal,

            // For RemoTalk plugin
            getSavedFileInCurrentChannel,
        }, dispatch),
    };
}

const connector = connect(mapStateToProps, mapDispatchToProps);

export type PropsFromRedux = ConnectedProps<typeof connector>;

export default connector(FileAttachment);
