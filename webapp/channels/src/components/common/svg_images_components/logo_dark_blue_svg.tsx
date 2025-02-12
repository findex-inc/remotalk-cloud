// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import styled from 'styled-components';

type Props = {
    width?: number;
    height?: number;
    className?: string;
}

const Svg = styled.svg.attrs({
    version: '1.1',
    xmlns: 'http://www.w3.org/2000/svg',
    xmlnsXlink: 'http://www.w3.org/1999/xlink',
})``;

export default (props: Props) => (
    <Svg
        className={props.className}
        width={props.width ? props.width.toString() : '182'}
        height={props.height ? props.height.toString() : '30'}
        viewBox='0 0 360 72'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
    >
        <g>
            <g>
                <path
                    d='M94.4,13.4c3-0.5,7.6-0.9,12.6-0.9c6.2,0,10.6,0.9,13.5,3.3c2.5,2,3.9,4.9,3.9,8.8c0,5.3-3.8,9-7.4,10.3v0.2
                    c2.9,1.2,4.5,4,5.6,7.8c1.3,4.7,2.6,10.2,3.4,11.8h-9.7c-0.7-1.2-1.7-4.6-2.9-9.8c-1.1-5.2-2.9-6.7-6.8-6.7h-2.9v16.5h-9.4V13.4z
                    M103.8,31.4h3.7c4.7,0,7.5-2.4,7.5-6c0-3.9-2.6-5.8-7-5.8c-2.3,0-3.6,0.2-4.3,0.3V31.4z'
                />
                <path
                    d='M136.7,42.5c0.3,3.9,4.2,5.8,8.6,5.8c3.2,0,5.8-0.4,8.4-1.2l1.2,6.4c-3.1,1.2-6.9,1.9-11,1.9c-10.3,0-16.2-6-16.2-15.5
                    c0-7.7,4.8-16.2,15.4-16.2c9.8,0,13.6,7.6,13.6,15.2c0,1.6-0.2,3-0.3,3.7H136.7z M147.8,36.1c0-2.3-1-6.2-5.3-6.2
                    c-4,0-5.6,3.6-5.8,6.2H147.8z'
                />
                <path
                    d='M160.7,34c0-3.8-0.1-7-0.2-9.7h8l0.4,4.1h0.2c1.3-1.9,4-4.8,9.2-4.8c3.9,0,7,2,8.3,5.2h0.1c1.1-1.6,2.5-2.8,3.9-3.7
                    c1.7-1,3.5-1.5,5.8-1.5c5.8,0,10.3,4.1,10.3,13.2v17.9h-9.2V38.2c0-4.4-1.4-7-4.5-7c-2.2,0-3.7,1.5-4.4,3.3
                    c-0.2,0.7-0.4,1.7-0.4,2.4v17.8H179v-17c0-3.9-1.4-6.5-4.4-6.5c-2.4,0-3.9,1.9-4.4,3.4c-0.3,0.7-0.4,1.6-0.4,2.4v17.7h-9.2V34z'
                />
                <path
                    d='M242.6,39.2c0,11.1-7.9,16.2-16,16.2c-8.9,0-15.7-5.8-15.7-15.7c0-9.8,6.5-16.1,16.2-16.1C236.4,23.6,242.6,30,242.6,39.2
                    z M220.6,39.5c0,5.2,2.2,9.1,6.2,9.1c3.7,0,6-3.7,6-9.1c0-4.5-1.7-9.1-6-9.1C222.3,30.4,220.6,35,220.6,39.5z'
                />
                <path
                    d='M256.8,20.8h-11.2v-8h32.2v8h-11.4v33.9h-9.5V20.8z'
                />
                <path
                    d='M296.7,54.7l-0.6-3h-0.2c-2,2.4-5.1,3.7-8.7,3.7c-6.2,0-9.8-4.5-9.8-9.3c0-7.9,7.1-11.7,17.8-11.6V34
                    c0-1.6-0.9-3.9-5.5-3.9c-3.1,0-6.4,1.1-8.4,2.3l-1.7-6.1c2.1-1.2,6.3-2.7,11.8-2.7c10.1,0,13.4,6,13.4,13.1v10.6
                    c0,2.9,0.1,5.7,0.4,7.4H296.7z M295.5,40.4c-5-0.1-8.8,1.1-8.8,4.8c0,2.4,1.6,3.6,3.7,3.6c2.4,0,4.3-1.6,4.9-3.5
                    c0.1-0.5,0.2-1.1,0.2-1.6V40.4z'
                />
                <path
                    d='M311.6,10.6h9.4v44.1h-9.4V10.6z'
                />
                <path
                    d='M338.1,37.1h0.1c0.7-1.2,1.4-2.5,2.2-3.7l6.2-9.1h11.4l-10.9,12.3l12.4,18.1h-11.6l-7.3-12.5l-2.4,3v9.5h-9.4V10.6h9.4
                    V37.1z'
                />
            </g>
        </g>
        <g>
            <path
                d='M66,0H6C2.7,0,0,2.7,0,6v60c0,3.3,2.7,6,6,6h60c3.3,0,6-2.7,6-6V6C72,2.7,69.3,0,66,0z M36,63.7c-6,0-11.6-1.9-16.2-5.2
                L8,64.1l5.6-11.8C10.3,47.7,8.3,42.1,8.3,36C8.3,20.7,20.7,8.3,36,8.3c15.3,0,27.7,12.4,27.7,27.7C63.7,51.3,51.3,63.7,36,63.7z'
            />
            <path
                d='M21.9,43.9h9.6l-9.6,9.6h0V43.9z M31.5,21.9c-5.3,0-9.6,4.3-9.6,9.6c0,0,0,0,0,0h18c2.6,0,5-1.1,6.8-2.8l0.1-0.1l6.8-6.8
                H31.5z M21.9,42.5h7c2.6,0,5-1.1,6.8-2.8l0.1-0.1l6.8-6.8H21.9V42.5z'
            />
        </g>
    </Svg>
);
