import { expect, it, vi } from 'vitest';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { saveCloverObservation } from '../logic-functions/save-clover-observation';
import { type CloverMerchantObservation } from '../contracts/merchant-observation';
const observation: CloverMerchantObservation = {
  connectedAccountId: '11111111-1111-4111-8111-111111111111',
  merchantId: 'ABCDEFGHIJKLM',
  merchantName: 'Synthetic',
  observedAt: '2026-09-07T00:00:00Z',
  sourceRevision: 'merchant-v1',
  sourcePath: '/v3/merchants/ABCDEFGHIJKLM',
  scopeVerification: 'unknown',
};
it('never writes observations when native access denies the parent record', async () => {
  const transport = vi.fn(async () => new Response('{}', { status: 403 }));
  const client = new RestApiClient({
    baseUrl: 'https://native.invalid',
    token: 'synthetic',
    fetch: transport,
  });
  await expect(saveCloverObservation(client, observation)).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(1);
});
it('rejects a parent connection whose identity disagrees with native credential binding', async () => {
  const transport = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            cloverConnection: {
              connectedAccountId: observation.connectedAccountId,
              merchantId: 'NOPQRSTUVWXYZ',
            },
          },
        }),
      ),
  );
  const client = new RestApiClient({
    baseUrl: 'https://native.invalid',
    token: 'synthetic',
    fetch: transport,
  });
  await expect(saveCloverObservation(client, observation)).rejects.toThrow(
    'binding mismatch',
  );
  expect(transport).toHaveBeenCalledTimes(1);
});
it('does not proceed after an unconfirmed parent creation', async () => {
  const transport = vi.fn(async () => new Response('{}', { status: 404 }));
  const client = new RestApiClient({
    baseUrl: 'https://native.invalid',
    token: 'synthetic',
    fetch: transport,
  });
  await expect(saveCloverObservation(client, observation)).rejects.toThrow();
  expect(transport).toHaveBeenCalledTimes(3);
});
