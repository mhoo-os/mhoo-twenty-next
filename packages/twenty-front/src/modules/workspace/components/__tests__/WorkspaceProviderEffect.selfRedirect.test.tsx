/**
 * @jest-environment-options {"url":"https://app.example.com"}
 */

import { i18n } from '@lingui/core';
import { act, render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';

import { isAppEffectRedirectEnabledState } from '@/app/states/isAppEffectRedirectEnabledState';
import { SignInUpSSOExchangeTokenEffect } from '@/auth/sign-in-up/components/internal/SignInUpSSOExchangeTokenEffect';
import { tokenPairState } from '@/auth/states/tokenPairState';

import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { isSameOriginWorkspaceEnabledState } from '@/client-config/states/isSameOriginWorkspaceEnabledState';
import { domainConfigurationState } from '@/domain-manager/states/domainConfigurationState';
import { lastAuthenticatedWorkspaceDomainState } from '@/domain-manager/states/lastAuthenticatedWorkspaceDomainState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { WorkspaceProviderEffect } from '@/workspace/components/WorkspaceProviderEffect';

// The public-data and exchange transports are stubbed. Domain detection, query-state
// initialization, URL construction, debounce and redirect hooks remain real.
jest.mock('@/domain-manager/hooks/useGetPublicWorkspaceDataByDomain', () => ({
  useGetPublicWorkspaceDataByDomain: () => ({ data: undefined }),
}));

const mockExchange = jest.fn();

jest.mock('@apollo/client/react', () => ({
  ...jest.requireActual('@apollo/client/react'),
  useMutation: () => [mockExchange],
}));

jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({ enqueueErrorSnackBar: jest.fn() }),
}));

const renderProvider = (workspaceUrl: string, withExchangeEffect = false) => {
  jotaiStore.set(lastAuthenticatedWorkspaceDomainState.atom, {
    workspaceId: '20202020-1c25-4d02-bf25-6aeccf7ea419',
    workspaceUrl,
  });

  return render(
    <JotaiProvider store={jotaiStore}>
      <WorkspaceProviderEffect />
      {withExchangeEffect && <SignInUpSSOExchangeTokenEffect />}
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
    mockExchange.mockReset();
    mockExchange.mockImplementation(() => new Promise(() => {}));
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

  it.each(['https://app.example.com', 'https://workspace.example.com'])(
    'waits for exchange initialization before restoring %s',
    async (workspaceUrl) => {
      window.history.replaceState(
        null,
        '',
        '/welcome?locale=en#ssoExchangeToken=synthetic-exchange',
      );
      renderProvider(workspaceUrl);

      await flushRedirect();

      expect(window.open).not.toHaveBeenCalled();
    },
  );

  it.each(['https://app.example.com', 'https://workspace.example.com'])(
    'waits during real pending redemption before restoring %s',
    async (workspaceUrl) => {
      window.history.replaceState(
        null,
        '',
        '/welcome?locale=en#ssoExchangeToken=synthetic-exchange',
      );
      renderProvider(workspaceUrl, true);

      await flushRedirect();

      expect(mockExchange).toHaveBeenCalledTimes(1);
      expect(mockExchange).toHaveBeenCalledWith({
        variables: { ssoExchangeToken: 'synthetic-exchange' },
      });
      expect(window.location.hash).toBe('');
      expect(jotaiStore.get(isAppEffectRedirectEnabledState.atom)).toBe(false);
      expect(jotaiStore.get(tokenPairState.atom)).toBeNull();
      expect(window.open).not.toHaveBeenCalled();
    },
  );

  it('restores the remembered Workspace after native redemption completes', async () => {
    const tokens = {
      accessOrWorkspaceAgnosticToken: {
        token: 'synthetic-workspace-agnostic-token',
        expiresAt: '2100-01-01T00:00:00.000Z',
      },
      refreshToken: {
        token: 'synthetic-refresh-token',
        expiresAt: '2100-01-01T00:00:00.000Z',
      },
    };
    let finishExchange = () => {};
    mockExchange.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishExchange = () =>
            resolve({
              data: { getAuthTokensFromSSOExchangeToken: { tokens } },
            });
        }),
    );
    window.history.replaceState(
      null,
      '',
      '/welcome?locale=en#ssoExchangeToken=synthetic-exchange',
    );
    renderProvider('https://workspace.example.com', true);

    await flushRedirect();
    expect(window.open).not.toHaveBeenCalled();

    await act(async () => {
      finishExchange();
    });
    await flushRedirect();

    expect(jotaiStore.get(tokenPairState.atom)).toEqual(tokens);
    expect(jotaiStore.get(isAppEffectRedirectEnabledState.atom)).toBe(true);
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith(
      'https://workspace.example.com/welcome?locale=en',
      '_self',
    );
  });
});
