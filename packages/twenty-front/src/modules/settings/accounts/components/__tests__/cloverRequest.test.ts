import { enableFetchMocks } from 'jest-fetch-mock';

import {
  currentUserState,
  type CurrentUser,
} from '@/auth/states/currentUserState';
import {
  currentWorkspaceState,
  type CurrentWorkspace,
} from '@/auth/states/currentWorkspaceState';
import { isCookieAuthActiveState } from '@/auth/states/isCookieAuthActiveState';
import { tokenPairState } from '@/auth/states/tokenPairState';
import { cloverRequest } from '@/settings/accounts/components/SettingsCloverConnection';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

jest.mock('@linaria/react', () => ({ styled: { div: () => 'div' } }));

enableFetchMocks();

const makePair = (expired = false, workspaceId = 'hass', userId = 'owner') => ({
  accessOrWorkspaceAgnosticToken: {
    token: `e30.${btoa(JSON.stringify({ type: 'ACCESS', workspaceId, sub: userId, userId, userWorkspaceId: 'membership' }))}.synthetic`,
    expiresAt: new Date(
      Date.now() + (expired ? -60_000 : 3_600_000),
    ).toISOString(),
  },
  refreshToken: {
    token: 'synthetic-refresh',
    expiresAt: new Date(Date.now() + 7_200_000).toISOString(),
  },
});

describe('Clover request with native cookie authentication', () => {
  beforeEach(() => {
    resetJotaiStore();
    fetchMock.resetMocks();
    jotaiStore.set(currentWorkspaceState.atom, {
      id: 'hass',
    } as CurrentWorkspace);
    jotaiStore.set(currentUserState.atom, { id: 'owner' } as CurrentUser);
    jotaiStore.set(isCookieAuthActiveState.atom, true);
  });

  it('renews an expired dormant pair through native renewal before sending the explicit bearer', async () => {
    const stale = makePair(true);
    const fresh = makePair();
    fresh.accessOrWorkspaceAgnosticToken.token += '-renewed';
    jotaiStore.set(tokenPairState.atom, stale);
    fetchMock.mockResponses(
      JSON.stringify({ data: { renewToken: { tokens: fresh } } }),
      JSON.stringify({ enabled: true }),
    );

    await expect(cloverRequest('status')).resolves.toEqual({ enabled: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/metadata$/);
    expect(
      JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).variables,
    ).toEqual({ appToken: stale.refreshToken.token });
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${fresh.accessOrWorkspaceAgnosticToken.token}`,
        },
        credentials: 'same-origin',
        redirect: 'error',
      }),
    );
    expect(jotaiStore.get(tokenPairState.atom)).toEqual(fresh);
  });

  it('reuses a fresh matching pair without renewing', async () => {
    jotaiStore.set(tokenPairState.atom, makePair());
    fetchMock.mockResponseOnce(JSON.stringify({ enabled: true }));
    await cloverRequest('status');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/clover-token\/status$/,
    );
  });

  it.each([
    ['wrong Workspace', makePair(false, 'other-workspace')],
    ['wrong user', makePair(false, 'hass', 'other-user')],
    [
      'invalid expiry',
      {
        ...makePair(),
        accessOrWorkspaceAgnosticToken: {
          ...makePair().accessOrWorkspaceAgnosticToken,
          expiresAt: 'invalid',
        },
      },
    ],
  ])('rejects %s even when cookie auth is inactive', async (_label, pair) => {
    jotaiStore.set(isCookieAuthActiveState.atom, false);
    jotaiStore.set(tokenPairState.atom, pair);
    await expect(cloverRequest('status')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['another Workspace', 'other-workspace', 'owner'],
    ['another user', 'hass', 'other-user'],
  ])(
    'does not renew or dispatch a dormant pair for %s',
    async (_label, workspaceId, userId) => {
      jotaiStore.set(tokenPairState.atom, makePair(true, workspaceId, userId));
      await expect(cloverRequest('status')).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('does not dispatch if the native user changes during renewal', async () => {
    jotaiStore.set(tokenPairState.atom, makePair(true));
    fetchMock.mockResponseOnce(() => {
      jotaiStore.set(currentUserState.atom, {
        id: 'other-user',
      } as CurrentUser);
      return Promise.resolve(
        JSON.stringify({ data: { renewToken: { tokens: makePair() } } }),
      );
    });
    await expect(cloverRequest('status')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch if the token pair is replaced during renewal', async () => {
    jotaiStore.set(tokenPairState.atom, makePair(true));
    fetchMock.mockResponseOnce(() => {
      const replacement = makePair();
      replacement.refreshToken.token = 'replacement-refresh';
      jotaiStore.set(tokenPairState.atom, replacement);
      return Promise.resolve(
        JSON.stringify({ data: { renewToken: { tokens: makePair() } } }),
      );
    });
    await expect(cloverRequest('status')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not replay a submitted body after a permission refusal', async () => {
    jotaiStore.set(tokenPairState.atom, makePair());
    fetchMock.mockResponseOnce('{}', { status: 403 });
    await expect(
      cloverRequest('submit', {
        requestId: 'synthetic-handoff',
        accessToken: 'synthetic-provider-value',
        readOnlyConfirmed: true,
      }),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not persist or dispatch when the Workspace changes during renewal', async () => {
    const stale = makePair(true);
    jotaiStore.set(tokenPairState.atom, stale);
    fetchMock.mockResponseOnce(() => {
      jotaiStore.set(currentWorkspaceState.atom, {
        id: 'other-workspace',
      } as CurrentWorkspace);
      return Promise.resolve(
        JSON.stringify({ data: { renewToken: { tokens: makePair() } } }),
      );
    });
    await expect(cloverRequest('status')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jotaiStore.get(tokenPairState.atom)).toEqual(stale);
  });

  it.each([
    ['missing result', {}],
    ['expired result', { renewToken: { tokens: makePair(true) } }],
    [
      'different Workspace',
      { renewToken: { tokens: makePair(false, 'other-workspace') } },
    ],
  ])('does not persist or dispatch a renewal with %s', async (_label, data) => {
    const stale = makePair(true);
    jotaiStore.set(tokenPairState.atom, stale);
    fetchMock.mockResponseOnce(JSON.stringify({ data }));
    await expect(cloverRequest('status')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jotaiStore.get(tokenPairState.atom)).toEqual(stale);
  });

  it('does not renew or dispatch without a stored refresh token', async () => {
    const stale = makePair(true);
    stale.refreshToken.token = '';
    jotaiStore.set(tokenPairState.atom, stale);
    await expect(cloverRequest('status')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not retry renewal or dispatch when native renewal refuses authentication', async () => {
    const stale = makePair(true);
    jotaiStore.set(tokenPairState.atom, stale);
    fetchMock.mockResponseOnce('{}', { status: 401 });
    await expect(
      cloverRequest('submit', { requestId: 'synthetic-handoff' }),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/metadata$/);
    expect(jotaiStore.get(tokenPairState.atom)).toEqual(stale);
  });

  it('does not dispatch when the request is cancelled during renewal', async () => {
    const controller = new AbortController();
    jotaiStore.set(tokenPairState.atom, makePair(true));
    fetchMock.mockResponseOnce(() => {
      controller.abort();
      return Promise.resolve(
        JSON.stringify({ data: { renewToken: { tokens: makePair() } } }),
      );
    });
    await expect(
      cloverRequest('status', undefined, controller.signal),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
