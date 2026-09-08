const SIGN_OUT_CHANNEL_NAME = 'twenty-sign-out';

let sharedChannel: BroadcastChannel | null = null;

const getSharedSignOutChannel = (): BroadcastChannel | null => {
  if (sharedChannel) {
    return sharedChannel;
  }

  try {
    sharedChannel = new BroadcastChannel(SIGN_OUT_CHANNEL_NAME);
  } catch {
    return null;
  }

  return sharedChannel;
};

export const broadcastSignOutToOtherTabs = () => {
  getSharedSignOutChannel()?.postMessage({ type: 'sign-out' });
};

const WORKSPACE_CHANGE_KEY = 'twenty-workspace-session-changed';

// Invalidation only: no identity, token or Workspace selector is broadcast.
export const broadcastWorkspaceChangeToOtherTabs = () => {
  getSharedSignOutChannel()?.postMessage({ type: 'workspace-session-changed' });
  try {
    localStorage.setItem(WORKSPACE_CHANGE_KEY, crypto.randomUUID());
  } catch {
    /* Channel remains available when storage is disabled. */
  }
};

export const subscribeToSignOutFromOtherTabs = (
  callback: () => void,
  onWorkspaceChange: () => void = () => {},
): (() => void) => {
  const channel = getSharedSignOutChannel();

  const onStorage = (event: StorageEvent) => {
    if (event.key === WORKSPACE_CHANGE_KEY) onWorkspaceChange();
  };
  window.addEventListener('storage', onStorage);

  if (channel)
    channel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === 'sign-out') callback();
      if (event.data?.type === 'workspace-session-changed') onWorkspaceChange();
    };

  return () => {
    if (channel) channel.onmessage = null;
    window.removeEventListener('storage', onStorage);
  };
};
