import { describe, expect, it, vi } from 'vitest';
import {
  CLOVER_DATA_READ_OPERATIONS,
  readCloverData,
} from '../logic-functions/clover-data-read';

const connection = {
  id: 'connection-a',
  providerName: 'clover-manual',
  handle: 'ABCDEFGHIJKLM',
  accessToken: 'synthetic-private-provider-token',
  authFailedAt: null,
};

function dependencies(response: unknown = { elements: [] }) {
  return {
    list: vi.fn(async () => [connection]),
    get: vi.fn(async () => connection),
    fetch: vi.fn(async () =>
      new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  };
}

describe('native Clover data read', () => {
  it('preserves every provider read operation from the standalone catalog', () => {
    expect(CLOVER_DATA_READ_OPERATIONS).toHaveLength(23);
    expect(CLOVER_DATA_READ_OPERATIONS).toContain('clover_merchant_get');
    expect(CLOVER_DATA_READ_OPERATIONS).toContain('clover_employees_list');
    expect(CLOVER_DATA_READ_OPERATIONS).not.toContain('clover_who_am_i');
  });

  it('uses the selected native connection for a fixed, bounded provider GET', async () => {
    const d = dependencies({
      elements: [
        {
          id: 'payment-1',
          amount: 2200,
          result: 'SUCCESS',
          cardTransaction: { cardType: 'VISA', cardNumber: '4111111111111111' },
          accessToken: connection.accessToken,
        },
      ],
    });
    const result = await readCloverData(
      { operation: 'clover_payments_list', input: {} },
      d,
    );
    const [request, init] = d.fetch.mock.calls[0];
    const url = new URL(String(request));
    expect(url.origin).toBe('https://api.clover.com');
    expect(url.pathname).toBe(`/v3/merchants/${connection.handle}/payments`);
    expect(url.search).toBe('');
    expect(init?.method).toBe('GET');
    expect(init?.redirect).toBe('error');
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      `Bearer ${connection.accessToken}`,
    );
    expect(result).toMatchObject({
      connectionId: connection.id,
      operation: 'clover_payments_list',
      data: { elements: [{ id: 'payment-1', amount: 2200 }] },
    });
    expect(JSON.stringify(result)).not.toContain(connection.accessToken);
    expect(JSON.stringify(result)).not.toContain('4111111111111111');
  });

  it('rejects unknown operations and invalid endpoint filters before credential lookup', async () => {
    const d = dependencies();
    await expect(
      readCloverData({ operation: 'fetch_any_url', input: {} }, d),
    ).rejects.toThrow('Clover data is unavailable');
    await expect(
      readCloverData(
        { operation: 'clover_orders_list', input: { filter: 'password=abc' } },
        d,
      ),
    ).rejects.toThrow('Clover data is unavailable');
    expect(d.list).not.toHaveBeenCalled();
    expect(d.get).not.toHaveBeenCalled();
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it('does not access a native connection outside the current member visibility', async () => {
    const d = dependencies();
    await expect(
      readCloverData(
        {
          connectionId: 'connection-not-visible',
          operation: 'clover_merchant_get',
          input: {},
        },
        d,
      ),
    ).rejects.toThrow('Clover data is unavailable');
    expect(d.get).not.toHaveBeenCalled();
    expect(d.fetch).not.toHaveBeenCalled();
  });
});
