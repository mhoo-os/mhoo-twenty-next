import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import {
  StyledContainer,
  StyledIconChevronDown,
  StyledLabel,
  StyledLabelWrapper,
} from '@/ui/navigation/navigation-drawer/components/MultiWorkspaceDropdown/internal/MultiWorkspacesDropdownStyles';
import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { useResolvedBrand } from '@/client-config/hooks/useResolvedBrand';
import { useIsNavigationDrawerContentExpanded } from '@/navigation/hooks/useIsNavigationDrawerContentExpanded';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { getWorkspacePresentation } from '@/workspace/utils/getWorkspacePresentation';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import { useContext } from 'react';
import { Avatar } from 'twenty-ui/data-display';
import { ThemeContext } from 'twenty-ui/theme-constants';

type MultiWorkspaceDropdownClickableComponentProps = {
  disabled?: boolean;
  shouldHideLabel?: boolean;
};

export const MultiWorkspaceDropdownClickableComponent = ({
  disabled,
  shouldHideLabel = false,
}: MultiWorkspaceDropdownClickableComponentProps) => {
  const { theme } = useContext(ThemeContext);
  const brand = useResolvedBrand();
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const workspacePresentation = getWorkspacePresentation(
    brand,
    currentWorkspace,
  );

  const isNavigationDrawerExpanded = useIsNavigationDrawerContentExpanded();
  return (
    <StyledContainer
      data-testid="workspace-dropdown"
      isNavigationDrawerExpanded={isNavigationDrawerExpanded}
      disabled={disabled}
    >
      <Avatar
        placeholder={workspacePresentation.workspace.name}
        avatarUrl={getAbsoluteImageUrl(workspacePresentation.workspace.logoUrl)}
      />
      {!shouldHideLabel && (
        <>
          <StyledLabelWrapper>
            <NavigationDrawerAnimatedCollapseWrapper>
              <StyledLabel>{workspacePresentation.workspace.name}</StyledLabel>
            </NavigationDrawerAnimatedCollapseWrapper>
          </StyledLabelWrapper>
          <NavigationDrawerAnimatedCollapseWrapper>
            <StyledIconChevronDown
              size={theme.icon.size.md}
              stroke={theme.icon.stroke.sm}
            />
          </NavigationDrawerAnimatedCollapseWrapper>
        </>
      )}
    </StyledContainer>
  );
};
