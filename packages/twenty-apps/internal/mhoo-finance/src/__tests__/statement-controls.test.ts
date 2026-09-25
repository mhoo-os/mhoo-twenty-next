import { describe, expect, it } from 'vitest';

import {
  formatStatementControlMoney,
  parseStatementControls,
} from '../investigation/statement-controls';

describe('retained statement controls', () => {
  it('accepts safe numeric minor units from a partial source artifact', () => {
    expect(
      parseStatementControls(
        JSON.stringify({
          periodStart: '2024-10-01',
          periodEnd: '2024-10-31',
          openingBalanceMinor: 12345,
          closingBalanceMinor: 67890,
        }),
      ),
    ).toEqual({
      opening: '12345',
      closing: '67890',
      moneyIn: null,
      moneyOut: null,
      currencyCode: null,
    });
  });

  it('formats controls only for an explicit supported currency', () => {
    const controls = parseStatementControls(
      JSON.stringify({
        openingBalanceMinor: 12345,
        closingBalanceMinor: 67890,
        moneyInMinor: 60000,
        moneyOutMinor: 456,
        currencyCode: 'USD',
      }),
    );
    expect(controls).not.toBeNull();
    expect(
      formatStatementControlMoney(controls?.opening ?? null, controls?.currencyCode ?? null),
    ).toBe('USD 123.45');
    expect(
      formatStatementControlMoney('12345', null),
    ).toBe('12345 minor units · currency unavailable');
  });

  it('rejects unsafe numeric controls rather than rounding them', () => {
    expect(
      parseStatementControls(
        JSON.stringify({ openingBalanceMinor: Number.MAX_SAFE_INTEGER + 1 }),
      ),
    ).toBeNull();
  });
});
