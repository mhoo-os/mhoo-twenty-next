import { describe, expect, it } from 'vitest';

import {
  compareAdjacentChaseCheckingControls,
  parseChaseCheckingPdfControlsText,
} from 'src/ingestion/chase-pdf-controls';

const fixture = (period: string, opening: string, closing: string, extra = '') => [
  'Page 1 of 3',
  'SYNTHETIC BUSINESS LLC',
  period,
  'CHECKING SUMMARY Chase Business Complete Checking',
  'INSTANCES AMOUNT',
  `Beginning Balance $${opening}`,
  'Deposits and Additions 2 150.00',
  'Checks Paid 1 -25.00',
  'Electronic Withdrawals 1 -10.00',
  extra,
  `Ending Balance ${extra ? 5 : 4} $${closing}`,
  'Page 2 of 3',
  'SYNTHETIC TRANSACTION DETAILS',
  'Page 3 of 3',
].filter(Boolean).join('\n');

describe('Chase PDF statement summary controls', () => {
  it('extracts exact controls and complete page sequence from synthetic text', () => {
    const parsed = parseChaseCheckingPdfControlsText(fixture(
      'October 01, 2024 through October 31, 2024',
      '100.00',
      '215.00',
    ));
    expect(parsed).toMatchObject({
      profileId: 'chase-business-complete-checking-pdf-controls-v1',
      periodStart: '2024-10-01',
      periodEnd: '2024-10-31',
      openingBalanceMinor: 10000,
      closingBalanceMinor: 21500,
      expectedPageCount: 3,
      observedPageNumbers: [1, 2, 3],
      reportedTransactionCount: 4,
    });
    expect(parsed.categories['Deposits and Additions']).toEqual({ count: 2, amountMinor: 15000 });
  });

  it('includes other withdrawals instead of hiding a control difference', () => {
    const parsed = parseChaseCheckingPdfControlsText(fixture(
      'November 01, 2024 through November 29, 2024',
      '215.00',
      '205.00',
      'Other Withdrawals 1 -125.00',
    ));
    expect(parsed.categories['Other Withdrawals']).toEqual({ count: 1, amountMinor: -12500 });
  });

  it('rejects missing pages, unknown categories, and arithmetic or count mismatches', () => {
    const valid = fixture('October 01, 2024 through October 31, 2024', '100.00', '215.00');
    expect(() => parseChaseCheckingPdfControlsText(valid.replace('Page 2 of 3', ''))).toThrow('page sequence');
    expect(() => parseChaseCheckingPdfControlsText(valid.replace('Checks Paid', 'Unexpected Debits'))).toThrow('unsupported');
    expect(() => parseChaseCheckingPdfControlsText(valid.replace('Ending Balance 4 $215.00', 'Ending Balance 4 $215.01'))).toThrow('does not reconcile');
    expect(() => parseChaseCheckingPdfControlsText(valid.replace('Ending Balance 4 $215.00', 'Ending Balance 5 $215.00'))).toThrow('does not reconcile');
  });

  it('accepts an extractor-joined page marker without accepting a longer page count', () => {
    const valid = fixture('October 01, 2024 through October 31, 2024', '100.00', '215.00');
    expect(parseChaseCheckingPdfControlsText(valid.replace('Page 2 of 3', 'Page 2 of 3CONTINUED')).observedPageNumbers).toEqual([1, 2, 3]);
    expect(parseChaseCheckingPdfControlsText(valid.replace('Page 2 of 3', 'CONTINUEDPage 2 of 3')).observedPageNumbers).toEqual([1, 2, 3]);
    expect(() => parseChaseCheckingPdfControlsText(valid.replace('Page 2 of 3', 'Page 2 of 30CONTINUED'))).toThrow('page sequence');
  });

  it('requires adjacent periods and matching carried balances', () => {
    const october = parseChaseCheckingPdfControlsText(fixture('October 01, 2024 through October 31, 2024', '100.00', '215.00'));
    const november = parseChaseCheckingPdfControlsText(fixture('November 01, 2024 through November 29, 2024', '215.00', '205.00', 'Other Withdrawals 1 -125.00'));
    expect(compareAdjacentChaseCheckingControls(october, november)).toBe(true);
    expect(compareAdjacentChaseCheckingControls(october, { ...november, openingBalanceMinor: 21499 })).toBe(false);
    expect(compareAdjacentChaseCheckingControls(october, { ...november, periodStart: '2024-11-02' })).toBe(false);
  });
});
