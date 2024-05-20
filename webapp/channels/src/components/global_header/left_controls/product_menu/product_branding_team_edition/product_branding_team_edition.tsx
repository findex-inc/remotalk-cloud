// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import styled from 'styled-components';

import Logo from 'components/common/svg_images_components/logo_dark_blue_svg';

const ProductBrandingTeamEditionContainer = styled.div`
    display: flex;
    align-items: center;

    > * + * {
        margin-left: 8px;
    }
`;

const StyledLogo = styled(Logo)`
    path {
        fill: rgba(var(--sidebar-text-rgb), 0.75);
    }
`;

const ProductBrandingTeamEdition = (): JSX.Element => {
    return (
        <ProductBrandingTeamEditionContainer tabIndex={0}>
            <StyledLogo
                width={116}
                height={20}
            />
        </ProductBrandingTeamEditionContainer>
    );
};

export default ProductBrandingTeamEdition;
