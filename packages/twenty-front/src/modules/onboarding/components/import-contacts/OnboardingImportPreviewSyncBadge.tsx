import { styled } from '@linaria/react';
import { MHO_BRAND } from 'twenty-shared/branding';
import { IconArrowRight, IconGoogle, IconMicrosoft } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme-constants';

import { brandState } from '@/client-config/states/brandState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const SYNC_BADGE_LOGO_SIZE = 16;

const StyledBadge = styled.div`
  align-items: center;
  backdrop-filter: blur(20px);
  background-color: ${themeCssVariables.background.transparent.secondary};
  border: 1px solid ${themeCssVariables.background.transparent.lighter};
  border-left: none;
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  box-sizing: border-box;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  left: 50%;
  padding: ${themeCssVariables.spacing[2]};
  position: absolute;
  top: 83px;
  transform: translateX(-50%);
`;

const StyledDivider = styled.div`
  align-self: stretch;
  background-color: ${themeCssVariables.border.color.medium};
  width: 1px;
`;

const StyledProductLogo = styled.img`
  border-radius: ${themeCssVariables.border.radius.xs};
  height: ${SYNC_BADGE_LOGO_SIZE}px;
  width: ${SYNC_BADGE_LOGO_SIZE}px;
`;

export const OnboardingImportPreviewSyncBadge = () => {
  const theme = useTheme();
  const brand = useAtomStateValue(brandState) ?? MHO_BRAND;

  return (
    <StyledBadge>
      <IconGoogle size={theme.icon.size.md} />
      <IconMicrosoft size={theme.icon.size.md} />
      <StyledDivider />
      <IconArrowRight
        size={theme.icon.size.md}
        color={themeCssVariables.font.color.tertiary}
      />
      <StyledProductLogo
        src={brand.assets.productMark.path}
        alt={brand.accessibility.logoAltText}
      />
    </StyledBadge>
  );
};
