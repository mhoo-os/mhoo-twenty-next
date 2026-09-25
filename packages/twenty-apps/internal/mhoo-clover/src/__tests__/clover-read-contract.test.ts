import { describe, expect, it, vi } from 'vitest';
import { invokeNativeCloverRead } from '../clover-read/client';

describe('native Clover request contract', () => {
  it('preserves repeated filters and bounded order pagination', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.searchParams.getAll('filter')).toEqual([
        'createdTime>=1',
        'createdTime<2',
      ]);
      expect(url.searchParams.get('limit')).toBe('100');
      expect(url.searchParams.get('offset')).toBe('0');
      expect(url.searchParams.get('expand')).toBe(
        'employee,customers,orderType',
      );
      return Response.json({ elements: [] });
    });

    await invokeNativeCloverRead(
      { merchantId: 'ABCDEFGHIJKLM', accessToken: 'private-token' },
      'clover_orders_list',
      {
        filter: ['createdTime>=1', 'createdTime<2'],
        limit: 100,
        offset: 0,
        expand: ['employee', 'customers', 'orderType'],
      },
      fetch,
    );
  });

  it('rejects more than three provider expansions', async () => {
    await expect(
      invokeNativeCloverRead(
        { merchantId: 'ABCDEFGHIJKLM', accessToken: 'private-token' },
        'clover_orders_list',
        { expand: ['employee', 'customers', 'orderType', 'payments'] },
        vi.fn(),
      ),
    ).rejects.toThrow('invalid_tool_input');
  });

  it('preserves compound AND filters for payment date ranges', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('filter')).toBe(
        'createdTime>=1 AND createdTime<2',
      );
      return Response.json({ elements: [] });
    });

    await invokeNativeCloverRead(
      { merchantId: 'ABCDEFGHIJKLM', accessToken: 'private-token' },
      'clover_payments_list',
      { filter: 'createdTime>=1 AND createdTime<2' },
      fetch,
    );
  });
});
