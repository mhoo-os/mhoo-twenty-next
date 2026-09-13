import {
  broadcastWorkspaceChangeToOtherTabs,
  subscribeToSignOutFromOtherTabs,
} from '@/auth/utils/crossTabSignOut';

const channel = {
  postMessage: jest.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
};

beforeAll(() => {
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    configurable: true,
    value: jest.fn(() => channel),
  });
});
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

it('broadcasts invalidation without identity or credentials', () => {
  broadcastWorkspaceChangeToOtherTabs();
  expect(channel.postMessage).toHaveBeenCalledWith({
    type: 'workspace-session-changed',
  });
  expect(localStorage.getItem('twenty-workspace-session-changed')).toMatch(
    /^[0-9a-f-]{36}$/,
  );
});

it('reloads Workspace context without signing out the replacement session', () => {
  const signOut = jest.fn();
  const changed = jest.fn();
  const unsubscribe = subscribeToSignOutFromOtherTabs(signOut, changed);
  channel.onmessage?.(
    new MessageEvent('message', {
      data: { type: 'workspace-session-changed' },
    }),
  );
  expect(changed).toHaveBeenCalledTimes(1);
  expect(signOut).not.toHaveBeenCalled();
  channel.onmessage?.(
    new MessageEvent('message', { data: { type: 'sign-out' } }),
  );
  expect(signOut).toHaveBeenCalledTimes(1);
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'twenty-workspace-session-changed',
      newValue: 'invalidation-only',
    }),
  );
  expect(changed).toHaveBeenCalledTimes(2);
  unsubscribe();
  window.dispatchEvent(
    new StorageEvent('storage', { key: 'twenty-workspace-session-changed' }),
  );
  expect(changed).toHaveBeenCalledTimes(2);
  expect(channel.onmessage).toBeNull();
});
