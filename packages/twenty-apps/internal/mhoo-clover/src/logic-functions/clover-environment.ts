import { listConnections } from 'twenty-sdk/logic-function';

const origins = {
  'clover-manual': 'https://api.clover.com',
  'clover-manual-sandbox': 'https://apisandbox.dev.clover.com',
} as const;

export type CloverProviderName = keyof typeof origins;

export const isCloverProviderName = (
  name: string,
): name is CloverProviderName =>
  name === 'clover-manual' || name === 'clover-manual-sandbox';

// The native provider attached to the credential selects the endpoint. Neither
// a payload nor a Workspace record may supply an origin.
export const cloverOrigin = (providerName: string): string => {
  if (!isCloverProviderName(providerName))
    throw new Error('Unsupported Clover connection');
  return origins[providerName];
};

export const cloverEnvironment = (
  providerName: string,
): 'sandbox' | 'production-na' => {
  if (!isCloverProviderName(providerName))
    throw new Error('Unsupported Clover connection');
  return providerName === 'clover-manual-sandbox'
    ? 'sandbox'
    : 'production-na';
};

export const listVisibleCloverConnections = async () => {
  const [production, sandbox] = await Promise.all([
    listConnections({ providerName: 'clover-manual' }, { runAs: 'user' }),
    listConnections({ providerName: 'clover-manual-sandbox' }, { runAs: 'user' }),
  ]);
  return [...production, ...sandbox];
};
