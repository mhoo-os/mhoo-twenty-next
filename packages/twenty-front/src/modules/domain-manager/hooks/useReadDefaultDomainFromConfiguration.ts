import { isSameOriginWorkspaceEnabledState } from '@/client-config/states/isSameOriginWorkspaceEnabledState';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useReadDefaultDomainFromConfiguration = () => {
  const domainConfiguration = useAtomStateValue(domainConfigurationState);
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );

  const isSameOriginWorkspaceEnabled = useAtomStateValue(
    isSameOriginWorkspaceEnabledState,
  );

  const defaultDomain = isMultiWorkspaceEnabled && !isSameOriginWorkspaceEnabled
    ? `${domainConfiguration.defaultSubdomain}.${domainConfiguration.frontDomain}`
    : domainConfiguration.frontDomain;

  return {
    defaultDomain,
  };
};
