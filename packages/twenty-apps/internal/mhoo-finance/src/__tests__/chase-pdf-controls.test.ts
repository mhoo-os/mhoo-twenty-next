import { describe, expect, it } from 'vitest';

import {
  compareAdjacentChaseCheckingControls,
  createChaseCheckingPdfControlEvidence,
  createChaseCheckingStatementRowLineage,
  parseChaseCheckingPdfControlsText,
  parseChaseCheckingPdfRowsText,
  normalizeChasePdfTextPageBoundaries,
  reconcileChaseCheckingPdfRows,
} from 'src/ingestion/chase-pdf-controls';
import {
  SYNTHETIC_BANK_CSV_V1,
  parseCsvStatement,
  retainUnparsedPdfArtifact,
} from 'src/ingestion/statement-importer';

const fixture = (period: string, opening: string, closing: string, extra = '') => [
  'Page 1 of 3',
  'SYNTHETIC BUSINESS LLC',
  period,
  'CHECKING SUMMARY Chase Business Complete Checking',
  'INSTANCES AMOUNT',
  `Beginning Balance ${opening.startsWith('-$') ? opening : `$${opening}`}`,
  'Deposits and Additions 2 150.00',
  'Checks Paid 1 -25.00',
  'Electronic Withdrawals 1 -10.00',
  extra,
  `Ending Balance ${extra ? 5 : 4} ${closing.startsWith('-$') ? closing : `$${closing}`}`,
  'Page 2 of 3',
  'SYNTHETIC TRANSACTION DETAILS',
  'Page 3 of 3',
].filter(Boolean).join('\n');

const bytes = (content: string): Uint8Array => new TextEncoder().encode(content);

const custodyPdf = (pages: readonly number[] = [1, 2, 3]) => retainUnparsedPdfArtifact({
  artifactId: 'synthetic-chase-october-pdf',
  accountKey: 'acct-synthetic-chase',
  sourceKind: 'BANK',
  originalFileName: 'synthetic-chase-october.pdf',
  mimeType: 'application/pdf',
  bytes: bytes('%PDF-synthetic-chase'),
  acquiredAt: '2026-09-14T00:00:00.000Z',
  acquiredBy: 'fixture-author',
  originalFileId: 'synthetic-files-reference-chase-pdf-001',
}, 3, pages);

const rowsFor = (count: number) => [
  'Date,Posted Date,Description,Amount,Transaction ID',
  ...Array.from({ length: count }, (_, index) => {
    const day = index === count - 1 ? 31 : index + 1;
    return `10/${String(day).padStart(2, '0')}/2024,10/${String(day).padStart(2, '0')}/2024,Synthetic ${index + 1},${index === 0 ? '150.00' : '-10.00'},txn-${index + 1}`;
  }),
].join('\n');

const transactionStatement = (count = 4) => parseCsvStatement({
  artifactId: 'synthetic-chase-october-rows',
  accountKey: 'acct-synthetic-chase',
  sourceKind: 'BANK',
  originalFileName: 'synthetic-chase-october.csv',
  mimeType: 'text/csv',
  bytes: bytes(rowsFor(count)),
  acquiredAt: '2026-09-14T00:00:00.000Z',
  acquiredBy: 'fixture-author',
  originalFileId: 'synthetic-files-reference-chase-csv-001',
}, SYNTHETIC_BANK_CSV_V1);

describe('Chase PDF statement summary controls', () => {
  it('restores only Poppler raw form-feed page labels', () => {
    expect(normalizeChasePdfTextPageBoundaries('first\fsecond\f')).toContain('Page 2 of 2');
    expect(normalizeChasePdfTextPageBoundaries('one\ftwo\fthree\ffour\f')).toContain('Page 4 of 4');
    expect(normalizeChasePdfTextPageBoundaries('first\fsecond\fthird\ffourth\ffifth\fsixth\f')).toContain('Page 6 of 6');
    expect(normalizeChasePdfTextPageBoundaries('one\ftwo\fthree\ffour\ffive\fsix\fseven\feight\f')).toContain('Page 8 of 8');
    expect(normalizeChasePdfTextPageBoundaries('first\nPage 1 of 2\fsecond')).toContain('Page 1 of 2');
    expect(() => normalizeChasePdfTextPageBoundaries('one-page')).toThrow('two, four, six, or eight');
    expect(() => normalizeChasePdfTextPageBoundaries('one\ftwo\fthree\f')).toThrow('two, four, six, or eight');
    expect(() => normalizeChasePdfTextPageBoundaries('one\ftwo\fthree\ffour\ffive\f')).toThrow('two, four, six, or eight');
    expect(() => normalizeChasePdfTextPageBoundaries('one\ftwo\fthree\ffour\ffive\fsix\fseven\f')).toThrow('two, four, six, or eight');
  });
  it('parses observed multiline and compact row shapes with section direction', () => {
    const rows = parseChaseCheckingPdfRowsText([
      'Deposits and Additions',
      '10/03/2024 ACH CREDIT CUSTOMER PAYMENT',
      '$150.00',
      'Checks Paid',
      '1234 10/04/2024 -$25.00 RENT',
      'Electronic Withdrawals',
      '10/05/2024 CARD PURCHASE COFFEE',
      '$10.00',
    ].join('\n'), 2024);
    expect(rows).toEqual([
      expect.objectContaining({ category: 'Deposits and Additions', date: '2024-10-03', amountMinor: 15000 }),
      expect.objectContaining({ category: 'Checks Paid', date: '2024-10-04', amountMinor: -2500 }),
      expect.objectContaining({ category: 'Electronic Withdrawals', date: '2024-10-05', amountMinor: -1000 }),
    ]);
  });

  it('infers omitted transaction years from a cross-year statement window', () => {
    const rows = parseChaseCheckingPdfRowsText([
      'Deposits and Additions',
      '12/30 CARRY-IN',
      'Entry $150.00',
      'Checks Paid',
      '1234 01/03 -$25.00 JANUARY RENT',
    ].join('\n'), { periodStart: '2023-12-30', periodEnd: '2024-01-31' });
    expect(rows).toEqual([
      expect.objectContaining({ date: '2023-12-30', amountMinor: 15000 }),
      expect.objectContaining({ date: '2024-01-03', amountMinor: -2500 }),
    ]);
  });

  it('fails closed when an omitted year is outside the exact statement window', () => {
    expect(() => parseChaseCheckingPdfRowsText('Deposits and Additions\n12/01 CREDIT\nEntry $150.00', {
      periodStart: '2024-01-01',
      periodEnd: '2024-01-31',
    })).toThrow('ambiguous or outside');
  });

  it('fails closed when a multiline row has no terminating amount', () => {
    expect(() => parseChaseCheckingPdfRowsText('Deposits and Additions\n10/03/2024 ACH CREDIT', 2024)).toThrow('terminating amount');
  });

  it('stops before the daily ending balance table', () => {
    const rows = parseChaseCheckingPdfRowsText('Fees\n10/31 $5.00\nDAILY ENDING BALANCE\nDATE AMOUNT\n10/31 $200.00', 2024);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ category: 'Fees', amountMinor: -500 });
  });

  it('accepts masked Entry and Ind amount terminators', () => {
    const rows = parseChaseCheckingPdfRowsText('Deposits and Additions\n10/03 ACH CREDIT\nEntry $150.00\n10/04 CASH\nInd 25.00', 2024);
    expect(rows.map((row) => row.amountMinor)).toEqual([15000, 2500]);
  });

  it('accepts the observed CO Entry and multi-date deposit row shapes with credit sign', () => {
    const rows = parseChaseCheckingPdfRowsText([
      'Deposits and Additions',
      '10/03/2024 ACH CREDIT',
      'CO Entry $150.00',
      '10/04/2024 ACH CREDIT',
      'CO Entry 25.00',
      '10/05/2024 10/06/2024 BATCH $1.00 $2.00 $3.00,',
      '10/05/2024 BATCH CONTINUED',
      'On 4.00',
    ].join('\n'), 2024);

    expect(rows).toEqual([
      expect.objectContaining({ category: 'Deposits and Additions', date: '2024-10-03', amountMinor: 15000 }),
      expect.objectContaining({ category: 'Deposits and Additions', date: '2024-10-04', amountMinor: 2500 }),
      expect.objectContaining({ category: 'Deposits and Additions', date: '2024-10-05', amountMinor: 400 }),
    ]);
  });

  it('flags sub-cent PDF amount artifacts instead of treating precision as authoritative', () => {
    const [row] = parseChaseCheckingPdfRowsText('Deposits and Additions\n10/03 CREDIT\nEntry $150.0012345678901234567890', 2024);
    expect(row).toMatchObject({ amountMinor: 15000, amountPrecision: 'SUBCENT_ARTIFACT' });
  });

  it('splits a page marker joined to a terminal amount', () => {
    const rows = parseChaseCheckingPdfRowsText('Deposits and Additions\n10/03 CREDIT\nEntry $150.00\f2\nPage 2 of 3', 2024);
    expect(rows).toHaveLength(1);
  });

  it('reconciles parsed rows against controls and rejects mismatches', () => {
    const controls = parseChaseCheckingPdfControlsText(fixture('October 01, 2024 through October 31, 2024', '100.00', '215.00'));
    const rows = parseChaseCheckingPdfRowsText('Deposits and Additions\n10/03 CREDIT\nEntry $150.00\n10/04 CREDIT\nEntry $1.00\nChecks Paid\n1234 ^ 10/05 -$25.00\nElectronic Withdrawals\n10/06 CARD\nEntry $10.00', 2024);
    expect(() => reconcileChaseCheckingPdfRows(controls, rows)).toThrow('do not reconcile');
  });

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

  it('accepts negative-dollar opening and ending balances when arithmetic reconciles', () => {
    const parsed = parseChaseCheckingPdfControlsText(fixture(
      'October 01, 2024 through October 31, 2024',
      '-$353.81',
      '-$273.81',
    ).replace('Deposits and Additions 2 150.00', 'Deposits and Additions 1 100.00').replace('Checks Paid 1 -25.00', 'Checks Paid 1 -20.00').replace('\nElectronic Withdrawals 1 -10.00', '').replace('Ending Balance 4', 'Ending Balance 2'));

    expect(parsed).toMatchObject({ openingBalanceMinor: -35381, closingBalanceMinor: -27381, reportedTransactionCount: 2 });
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
  it('supports the reviewed ATM and debit-card withdrawal category with debit direction', () => {
    const rows = parseChaseCheckingPdfRowsText('ATM & Debit Card Withdrawals\n10/03 CASH\nEntry $12.34', 2024);
    expect(rows).toEqual([expect.objectContaining({ category: 'ATM & Debit Card Withdrawals', amountMinor: -1234 })]);
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

  it('binds complete PDF custody and a separate row source without asserting a PDF row parse', () => {
    const text = fixture('October 01, 2024 through October 31, 2024', '100.00', '215.00');
    const pdf = custodyPdf();
    const evidence = createChaseCheckingPdfControlEvidence(pdf, {
      schemaVersion: 'chase-pdf-text-extraction-v1',
      sourceArtifactSha256: pdf.receipt.sha256,
      text,
    });
    const lineage = createChaseCheckingStatementRowLineage(evidence, transactionStatement());

    expect(lineage).toMatchObject({
      schemaVersion: 'chase-checking-statement-row-lineage-v1',
      controlEvidence: { pdfArtifact: { artifactId: 'synthetic-chase-october-pdf', originalFileId: 'synthetic-files-reference-chase-pdf-001' } },
      transactionArtifact: { artifactId: 'synthetic-chase-october-rows', originalFileId: 'synthetic-files-reference-chase-csv-001' },
      rows: expect.arrayContaining([
        { sourceRecordId: 'txn-1', sourceLocation: 'csv:row:2' },
        { sourceRecordId: 'txn-2', sourceLocation: 'csv:row:3' },
      ]),
    });
  });

  it('fails closed when PDF custody, hash binding, period/account, or rows do not match', () => {
    const text = fixture('October 01, 2024 through October 31, 2024', '100.00', '215.00');
    const pdf = custodyPdf();
    expect(() => createChaseCheckingPdfControlEvidence(custodyPdf([1, 3]), { schemaVersion: 'chase-pdf-text-extraction-v1', sourceArtifactSha256: pdf.receipt.sha256, text })).toThrow('complete PDF page custody');
    expect(() => createChaseCheckingPdfControlEvidence(pdf, { schemaVersion: 'chase-pdf-text-extraction-v1', sourceArtifactSha256: 'other-bytes', text })).toThrow('retained PDF hash');
    const evidence = createChaseCheckingPdfControlEvidence(pdf, { schemaVersion: 'chase-pdf-text-extraction-v1', sourceArtifactSha256: pdf.receipt.sha256, text });
    expect(() => createChaseCheckingStatementRowLineage(evidence, transactionStatement(3))).toThrow('complete and reconcile');
    const statement = transactionStatement();
    expect(() => createChaseCheckingStatementRowLineage(evidence, { ...statement, receipt: { ...statement.receipt, accountKey: 'other-account' } })).toThrow('account binding');
    expect(() => createChaseCheckingStatementRowLineage(evidence, { ...statement, controls: { ...statement.controls, periodEnd: '2024-10-30' } })).toThrow('control period');
    expect(() => createChaseCheckingStatementRowLineage(evidence, { ...statement, rows: statement.rows.map((row, index) => index === 1 ? { ...row, sourceLocation: statement.rows[0].sourceLocation } : row) })).toThrow('unique source record and source location');
  });
});
