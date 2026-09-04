import { BrowserRouter } from 'react-router-dom';

import { RootApp } from '@/app/components/RootApp';
import { SharedAppProviders } from '@/app/components/SharedAppProviders';
import { WorkspaceApp } from '@/app/components/WorkspaceApp';
import { isOnOnboardingTransitionPath } from '@/auth/utils/isOnOnboardingTransitionPath';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { useIsCurrentLocationOnDefaultDomain } from '@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain';
import { OnboardingPageLoader } from '@/onboarding/components/OnboardingPageLoader';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { UserOrMetadataLoader } from '~/loading/components/UserOrMetadataLoader';
import { LegalDocumentApp } from '~/pages/legal/LegalDocumentApp';
import { isLegalDocumentPath } from '~/pages/legal/legal-document-config';

export const DomainShell = () => {
  const { isLoadedOnce } = useAtomStateValue(clientConfigApiStatusState);
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );
  const { isDefaultDomain } = useIsCurrentLocationOnDefaultDomain();

  if (!isLoadedOnce) {
    return (
      <BrowserRouter>
        <SharedAppProviders>
          {isOnOnboardingTransitionPath(window.location.pathname) ? (
            <OnboardingPageLoader />
          ) : (
            <UserOrMetadataLoader />
          )}
        </SharedAppProviders>
      </BrowserRouter>
    );
  }

  if (isLegalDocumentPath(window.location.pathname)) {
    return <LegalDocumentApp />;
  }

  if (!isMultiWorkspaceEnabled) {
    return <WorkspaceApp />;
  }

  return isDefaultDomain ? <RootApp /> : <WorkspaceApp />;
};
