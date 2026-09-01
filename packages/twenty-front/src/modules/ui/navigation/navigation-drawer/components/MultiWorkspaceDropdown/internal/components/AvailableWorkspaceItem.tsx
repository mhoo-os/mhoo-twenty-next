import { Avatar } from 'twenty-ui/data-display';
import { MenuItemSelectAvatar, UndecoratedLink } from 'twenty-ui/navigation';
import { type AvailableWorkspace } from '~/generated-metadata/graphql';
import { useResolvedBrand } from '@/client-config/hooks/useResolvedBrand';
import { useRedirectToWorkspaceDomain } from '@/domain-manager/hooks/useRedirectToWorkspaceDomain';
import { getWorkspaceUrl } from '~/utils/getWorkspaceUrl';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import { getAvailableWorkspacePathAndSearchParams } from '@/auth/utils/availableWorkspacesUtils';
import { getWorkspacePresentation } from '@/workspace/utils/getWorkspacePresentation';
import React from 'react';
import { useBuildWorkspaceUrl } from '@/domain-manager/hooks/useBuildWorkspaceUrl';

export const AvailableWorkspaceItem = ({
  availableWorkspace,
  isSelected,
}: {
  availableWorkspace: AvailableWorkspace;
  isSelected: boolean;
}) => {
  const brand = useResolvedBrand();
  const workspacePresentation = getWorkspacePresentation(
    brand,
    availableWorkspace,
  );
  const { buildWorkspaceUrl } = useBuildWorkspaceUrl();

  const { redirectToWorkspaceDomain } = useRedirectToWorkspaceDomain();

  const { pathname, searchParams } =
    getAvailableWorkspacePathAndSearchParams(availableWorkspace);

  const handleChange = async () => {
    await redirectToWorkspaceDomain(
      getWorkspaceUrl(availableWorkspace.workspaceUrls),
      pathname,
      searchParams,
    );
  };

  return (
    <UndecoratedLink
      key={availableWorkspace.id}
      to={buildWorkspaceUrl(
        getWorkspaceUrl(availableWorkspace.workspaceUrls),
        pathname,
        searchParams,
      )}
      onClick={(event) => {
        event.preventDefault();
        handleChange();
      }}
    >
      <MenuItemSelectAvatar
        text={workspacePresentation.workspace.name}
        avatar={
          <Avatar
            placeholder={workspacePresentation.workspace.name}
            avatarUrl={getAbsoluteImageUrl(
              workspacePresentation.workspace.logoUrl,
            )}
          />
        }
        selected={isSelected}
      />
    </UndecoratedLink>
  );
};
