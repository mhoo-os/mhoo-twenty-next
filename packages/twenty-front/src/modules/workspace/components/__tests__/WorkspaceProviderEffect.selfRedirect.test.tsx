/**
 * @jest-environment-options {"url":"https://app.example.com"}
 */

import { i18n } from '@lingui/core';
import { act, render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { isSameOriginWorkspaceEnabledState } from '@/client-config/states/isSameOriginWorkspaceEnabledState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { lastAuthenticatedWorkspaceDomainState } from '@/domain-manager/states/lastAuthenticatedWorkspaceDomainState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { WorkspaceProviderEffect } from '@/workspace/components/WorkspaceProviderEffect';

// Only the public-data transport is stubbed. Domain detection, query-state
// initialization, URL construction, debounce and redirect hooks remain real.
jest.mock('@/domain-manager/hooks/useGetPublicWorkspaceDataByDomain', () => ({
  useGetPublicWorkspaceDataByDomain: () => ({ data: undefined }),
}));

const renderProvider = (workspaceUrl: string) => {
  jotaiStore.set(lastAuthenticatedWorkspaceDomainState.atom, {
    workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
    workspaceUrl,
  });

  return render(
    <JotaiProvider store={jotaiStore}>
      <WorkspaceProviderEffect />
    </JotaiProvider>,
  );
};

const flushRedirect = async () => {
  await act(async () => {
    // URL-synced state is collected asynchronously before debounce starts.
    await Promise.resolve();
  });
  act(() => {
    jest.advanceTimersByTime(2);
  });
};

describe('WorkspaceProviderEffect default-domain self-redirect mitigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetJotaiStore();
    i18n.activate('en');
    window.history.replaceState(null, '', '/welcome?locale=en');
    jest.spyOn(window, 'open').mockImplementation(() => null);
    jotaiStore.set(isMultiWorkspaceEnabledState.atom, true);
    jotaiStore.set(isSameOriginWorkspaceEnabledState.atom, false);
    jotaiStore.set(domainConfigurationState.atom, {
      frontDomain: 'example.com',
      defaultSubdomain: 'app',
      publicFunctionDomain: undefined,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('does not reload plain welcome when the remembered Workspace URL is this origin', async () => {
    renderProvider(window.location.origin);

    await flushRedirect();

    expect(window.open).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/welcome');
  });

  it('preserves restoration to a different Workspace origin', async () => {
    renderProvider('https://workspace.example.com');

    await flushRedirect();

    expect(window.open).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith(
      'https://workspace.example.com/welcome?locale=en',
      '_self',
    );
  });

  it('keeps explicit creation intent on the default domain', async () => {
    window.history.replaceState(
      null,
      '',
      '/welcome?action=create-new-workspace&locale=en',
    );
    renderProvider('https://workspace.example.com');

    await flushRedirect();

    expect(window.open).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/welcome');
    expect(new URLSearchParams(window.location.search).get('action')).toBe(
      'create-new-workspace',
    );
  });
});
