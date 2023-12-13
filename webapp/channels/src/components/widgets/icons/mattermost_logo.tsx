// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

export default function MattermostLogo(props: React.HTMLAttributes<HTMLSpanElement>) {
    const {formatMessage} = useIntl();
    return (
        <span {...props}>
            <svg
                version='1.1'
                x='0px'
                y='0px'
                viewBox='0 0 72 72'
                enableBackground='new 0 0 72 72'
                role='img'
                aria-label={formatMessage({id: 'generic_icons.mattermost', defaultMessage: 'RemoTalk Logo'})}
            >
                <path
                    fill='#395784'
                    d='M0,72l8.8-18.4C5,47.9,3,41.3,3,34.4C3,15.4,18.5,0,37.5,0C56.5,0,72,15.4,72,34.4c0,19-15.5,34.4-34.5,34.4
                    c-6.8,0-13.3-2-19-5.7L0,72z M18.9,58.2l1,0.7c5.1,3.7,11.2,5.6,17.5,5.6c16.6,0,30.2-13.5,30.2-30.1c0-16.6-13.5-30.1-30.2-30.1
                    C20.9,4.3,7.3,17.8,7.3,34.4c0,6.4,2,12.5,5.8,17.7l0.8,1l-4.6,9.6L18.9,58.2z'
                />
                <path
                    fill='#395784'
                    d='M23.1,43.5h10.5L23.1,54h0V43.5z M33.7,19.4c-5.8,0-10.5,4.7-10.5,10.5c0,0,0,0,0,0h19.7c2.9,0,5.5-1.2,7.4-3l0.1-0.1
                    l7.4-7.4H33.7z M23.1,42h7.7c2.9,0,5.5-1.2,7.4-3l0.1-0.1l7.4-7.4H23.1V42z'
                />
            </svg>
        </span>
    );
}
