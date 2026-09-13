import { describe, expect, it, vi } from 'vitest';
import {
  PAYMENT_WINDOW_MS,
  planPaymentWindows,
  readCloverPayments,
} from '../logic-functions/clover-payment-read';

const page = {
  fromMs: 1000,
  toMs: 2000,
  timeField: 'modifiedTime' as const,
  offset: 0,
};
const payment = {
  id: 'ABCDEFGHIJKLM',
  amount: 212,
  createdTime: 1100,
  modifiedTime: 1500,
  result: 'SUCCESS',
  voided: false,
};
const connection = {
  id: 'connection',
  providerName: 'clover-manual',
  handle: 'ZYXWVUTSRQPON',
  accessToken: 'synthetic-private-provider-token',
  authFailedAt: null,
};
const deps = (elements: unknown[] = [payment]) => ({
  list: vi.fn(async () => [connection]),
  get: vi.fn(async () => connection),
  fetch: vi.fn(
    async () => new Response(JSON.stringify({ elements })),
  ) as unknown as typeof fetch,
});

describe('bounded Clover payment revision reads', () => {
  it('partitions a historical range without gaps or requests over 89 days', () => {
    expect(planPaymentWindows(0, 2 * PAYMENT_WINDOW_MS + 1)).toEqual([
      { fromMs: 0, toMs: PAYMENT_WINDOW_MS },
      { fromMs: PAYMENT_WINDOW_MS, toMs: 2 * PAYMENT_WINDOW_MS },
      { fromMs: 2 * PAYMENT_WINDOW_MS, toMs: 2 * PAYMENT_WINDOW_MS + 1 },
    ]);
    expect(() => planPaymentWindows(-1, 10)).toThrow();
  });
  it('uses fixed merchant custody, exact filters and allowlisted projection without currency assumptions', async () => {
    const dependency = deps([
      {
        ...payment,
        cardTransaction: { token: connection.accessToken },
        note: 'discard',
      },
    ]);
    const result = await readCloverPayments(
      { ...page, untrustedExtra: 'discard' } as never,
      dependency,
    );
    const request = vi.mocked(dependency.fetch).mock.calls[0];
    const url = new URL(String(request[0]));
    expect(url.origin).toBe('https://api.clover.com');
    expect(url.pathname).toBe(`/v3/merchants/${connection.handle}/payments`);
    expect(url.searchParams.getAll('filter')).toEqual([
      'modifiedTime>=1000',
      'modifiedTime<2000',
    ]);
    expect(request[1]?.method).toBe('GET');
    expect(request[1]?.redirect).toBe('error');
    expect(result.revisions[0]).toMatchObject({
      amountMinor: 212,
      currency: null,
    });
    expect(result.coverage).toBe('unverified');
    expect(JSON.stringify(result)).not.toContain(connection.accessToken);
    expect(JSON.stringify(result)).not.toContain('discard');
  });
  it('gives retries the same revision key and preserves changed provider facts as another revision', async () => {
    const first = await readCloverPayments(page, deps());
    const retry = await readCloverPayments(page, deps());
    const correction = await readCloverPayments(
      page,
      deps([{ ...payment, amount: 213, modifiedTime: 1600 }]),
    );
    expect(retry.revisions[0].revisionKey).toBe(first.revisions[0].revisionKey);
    expect(correction.revisions[0].revisionKey).not.toBe(
      first.revisions[0].revisionKey,
    );
  });
  it.each([
    { ...page, offset: -1 },
    { ...page, toMs: 2 * PAYMENT_WINDOW_MS },
    { ...page, timeField: 'arbitrary' },
  ])(
    'rejects unbounded or unsupported input before custody or network',
    async (invalid) => {
      const dependency = deps();
      await expect(
        readCloverPayments(invalid as never, dependency),
      ).rejects.toThrow('No import progress');
      expect(dependency.list).not.toHaveBeenCalled();
      expect(dependency.fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    { ...payment, amount: Number.MAX_SAFE_INTEGER + 1 },
    { ...payment, modifiedTime: 2000 },
    { ...payment, id: '../other' },
  ])(
    'rejects malformed/out-of-window data instead of silently skipping it',
    async (invalid) => {
      await expect(readCloverPayments(page, deps([invalid]))).rejects.toThrow(
        'No import progress',
      );
    },
  );
  it('retains pagination uncertainty and never equates an empty page with proven coverage', async () => {
    expect(
      (
        await readCloverPayments(
          page,
          deps(Array.from({ length: 100 }, () => payment)),
        )
      ).nextOffset,
    ).toBe(100);
    expect(await readCloverPayments(page, deps([]))).toMatchObject({
      revisions: [],
      nextOffset: null,
      coverage: 'unverified',
    });
  });
  it('bounds untrusted response bytes and hides provider errors', async () => {
    const dependency = deps();
    dependency.fetch = vi.fn(
      async () => new Response('x'.repeat(262145)),
    ) as unknown as typeof fetch;
    await expect(readCloverPayments(page, dependency)).rejects.toThrow(
      'No import progress',
    );
  });
});
