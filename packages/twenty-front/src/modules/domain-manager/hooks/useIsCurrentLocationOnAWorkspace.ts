import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isSameOriginWorkspaceEnabledState } from '@/client-config/states/isSameOriginWorkspaceEnabledState';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { useReadDefaultDomainFromConfiguration } from '@/domain-manager/hooks/useReadDefaultDomainFromConfiguration';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';

export const useIsCurrentLocationOnAWorkspace = () => {
  const { defaultDomain } = useReadDefaultDomainFromConfiguration();

  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );
  const isSameOriginWorkspaceEnabled = useAtomStateValue(
    isSameOriginWorkspaceEnabledState,
  );
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const domainConfiguration = useAtomStateValue(domainConfigurationState);

  if (
    isMultiWorkspaceEnabled &&
    (!isDefined(domainConfiguration.frontDomain) ||
      !isDefined(domainConfiguration.defaultSubdomain))
  ) {
    throw new Error('frontDomain and defaultSubdomain are required');
  }

  // UI routing follows resolved native session state, never a URL selector.
  const isOnAWorkspace = isSameOriginWorkspaceEnabled
    ? isDefined(currentWorkspace)
    : !isMultiWorkspaceEnabled || window.location.hostname !== defaultDomain;

  return {
    isOnAWorkspace,
  };
};
