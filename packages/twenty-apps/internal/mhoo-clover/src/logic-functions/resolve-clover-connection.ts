import { type CloverConnection } from './clover-merchant-read';

export type CloverConnectionDependencies = {
  list: () => Promise<CloverConnection[]>;
  get: (id: string) => Promise<CloverConnection>;
};

// Both operations use the native delegated identity. A selector never grants access.
export const resolveCloverConnection = async (
  dependencies: CloverConnectionDependencies,
  connectionId?: unknown,
) => {
  if (
    connectionId !== undefined &&
    (typeof connectionId !== 'string' ||
      !/^[a-zA-Z0-9-]{1,128}$/.test(connectionId))
  )
    throw new Error('Invalid connection selector');
  const visible = await dependencies.list();
  const candidates =
    connectionId === undefined
      ? visible
      : visible.filter((candidate) => candidate.id === connectionId);
  if (candidates.length !== 1)
    throw new Error('Select one authorized connection');
  const selected = candidates[0];
  const fresh = await dependencies.get(selected.id);
  if (
    fresh.id !== selected.id ||
    fresh.handle !== selected.handle ||
    fresh.providerName !== 'clover-manual' ||
    fresh.authFailedAt ||
    !/^[A-Z0-9]{13}$/.test(fresh.handle) ||
    !fresh.accessToken
  )
    throw new Error('Unavailable connection');
  return fresh;
};
