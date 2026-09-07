import { describe, expect, it, vi } from 'vitest';
import observationObject from '../objects/clover-merchant-observation.object';
import { observeCloverMerchant } from '../logic-functions/observe-clover-merchant';

const merchantId = 'ABCDEFGHIJKLM';
const token = 'synthetic-secret-not-a-real-token';
const connection = {
  id: 'connection',
  providerName: 'clover-manual',
  handle: merchantId,
  accessToken: token,
  authFailedAt: null,
};
const makeDependencies = () => ({
  list: vi.fn(async () => [connection]),
  get: vi.fn(async () => connection),
  fetch: vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          id: merchantId,
          name: 'Synthetic merchant',
          secret: token,
        }),
      ),
  ) as unknown as typeof fetch,
  save: vi.fn(async (_value: unknown) => undefined),
  now: () => new Date('2026-09-07T00:00:00Z'),
});

describe('Clover-owned merchant observation', () => {
  it('declares native object with no token or financial fields', () => {
    expect(observationObject.success).toBe(true);
    expect(observationObject.config?.fields.map((field) => field.name)).toEqual(
      [
        'merchantId',
        'merchantName',
        'observedAt',
        'sourceRevision',
        'sourcePath',
        'scopeVerification',
      ],
    );
  });
  it('publishes only bounded provider facts and server provenance after a successful read', async () => {
    const dependencies = makeDependencies();
    const result = await observeCloverMerchant(dependencies);
    expect(result).toEqual({
      merchantId,
      merchantName: 'Synthetic merchant',
      observedAt: '2026-09-07T00:00:00.000Z',
      sourceRevision: 'merchant-v1',
      sourcePath: `/v3/merchants/${merchantId}?fields=id,name`,
      scopeVerification: 'unknown',
    });
    expect(dependencies.save).toHaveBeenCalledWith(result);
    expect(JSON.stringify(result)).not.toContain(token);
  });
  it('does not save after provider rejection', async () => {
    const dependencies = makeDependencies();
    dependencies.fetch = vi.fn(
      async () => new Response(token, { status: 401 }),
    ) as unknown as typeof fetch;
    await expect(observeCloverMerchant(dependencies)).rejects.toThrow(
      'not confirmed saved',
    );
    expect(dependencies.save).not.toHaveBeenCalled();
  });
  it('does not claim success or leak errors when Workspace persistence denies', async () => {
    const dependencies = makeDependencies();
    dependencies.save.mockRejectedValue(new Error(token));
    await expect(observeCloverMerchant(dependencies)).rejects.toThrow(
      'not confirmed saved',
    );
    await expect(observeCloverMerchant(dependencies)).rejects.not.toThrow(
      token,
    );
  });
});
