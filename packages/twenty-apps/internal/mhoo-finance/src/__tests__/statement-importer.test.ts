import { describe, expect, it } from 'vitest';

import {
  SYNTHETIC_BANK_CSV_V1,
  importBoundedStatement,
  parseCsvStatement,
  parseQfxOfxStatement,
  reconcileStatementPeriod,
  retainUnparsedPdfArtifact,
  compareAdjacentPeriodBalances,
  compareStatementSummaryControls,
} from 'src/ingestion/statement-importer';
import { toFinanceNativeImportRecords } from 'src/ingestion/statement-import-adapter';

const bytes = (content: string): Uint8Array => new TextEncoder().encode(content);
const initialState = { receipts: [], rows: [] } as const;
const csvInput = (content: string, overrides: Record<string, unknown> = {}) => ({
  artifactId: 'synthetic-bank-february-v1',
  accountKey: 'acct-synthetic-1234',
  sourceKind: 'BANK' as const,
  originalFileName: 'synthetic-bank-february.csv',
  mimeType: 'text/csv',
  bytes: bytes(content),
  acquiredAt: '2026-09-05T12:00:00.000Z',
  acquiredBy: 'fixture-author',
  originalFileId: 'synthetic-files-reference-001',
  ...overrides,
});

const csv = [
  'Date,Posted Date,Description,Amount,Transaction ID',
  '02/01/2026,02/02/2026,"Synthetic settlement",125.00,txn-001',
  '02/03/2026,02/03/2026,"Synthetic supplies",-12.34,txn-002',
].join('\r\n');

describe('governed statement importer', () => {
  it('preserves original bytes and raw source values while mapping the documented synthetic CSV profile exactly', () => {
    const statement = parseCsvStatement(csvInput(`\uFEFF${csv}`), SYNTHETIC_BANK_CSV_V1);

    expect(statement.receipt).toMatchObject({
      accountKey: 'acct-synthetic-1234',
      originalFileName: 'synthetic-bank-february.csv',
      mimeType: 'text/csv',
      byteLength: bytes(`\uFEFF${csv}`).byteLength,
      acquiredAt: '2026-09-05T12:00:00.000Z',
      acquiredBy: 'fixture-author',
  originalFileId: 'synthetic-files-reference-001',
      parserProfileId: 'synthetic-bank-csv-v1',
    });
    expect(statement.rows).toEqual([
      expect.objectContaining({
        sourceLocation: 'csv:row:2',
        sourceRecordId: 'txn-001',
        transactionDate: '2026-02-01',
        postedDate: '2026-02-02',
        sourceAmount: '125.00',
        amountMinor: 12500,
        direction: 'INFLOW',
        rawValues: expect.objectContaining({ Amount: '125.00' }),
      }),
      expect.objectContaining({
        sourceLocation: 'csv:row:3',
        sourceAmount: '-12.34',
        amountMinor: -1234,
        direction: 'OUTFLOW',
      }),
    ]);
    expect(statement.rejectedRows).toEqual([]);
  });

  it('rejects malformed, ambiguous-date, and invalid-sign rows visibly instead of repairing them', () => {
    const statement = parseCsvStatement(csvInput([
      'Date,Posted Date,Description,Amount,Transaction ID',
      '2/03/2026,02/03/2026,Ambiguous date,5.00,txn-ambiguous',
      '02/03/2026,02/03/2026,Missing sign semantics,DR 5.00,txn-sign',
      '02/31/2026,02/03/2026,Impossible date,5.00,txn-invalid',
      '02/04/2026,02/04/2026,"Broken quote,5.00,txn-broken',
    ].join('\n')), SYNTHETIC_BANK_CSV_V1);

    expect(statement.rows).toEqual([]);
    expect(statement.rejectedRows.map((row) => row.code)).toEqual([
      'MALFORMED_ROW',
    ]);

    const visibleRows = parseCsvStatement(csvInput([
      'Date,Posted Date,Description,Amount,Transaction ID',
      '2/03/2026,02/03/2026,Ambiguous date,5.00,txn-ambiguous',
      '02/03/2026,02/03/2026,Invalid sign,DR 5.00,txn-sign',
      '02/31/2026,02/03/2026,Impossible date,5.00,txn-invalid',
    ].join('\n')), SYNTHETIC_BANK_CSV_V1);
    expect(visibleRows.rejectedRows.map((row) => row.code)).toEqual([
      'AMBIGUOUS_DATE',
      'INVALID_AMOUNT',
      'INVALID_DATE',
    ]);
  });

  it('parses QFX/OFX controls and proves exact minor-unit period arithmetic', () => {
    const qfx = [
      'OFXHEADER:100',
      '<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><ACCTID>synthetic</BANKACCTFROM><BANKTRANLIST><DTSTART>20260201<DTEND>20260228',
      '<STMTTRN><FITID>fit-1<DTPOSTED>20260202<TRNAMT>100.00<NAME>Synthetic deposit',
      '<STMTTRN><FITID>fit-2<DTPOSTED>20260203<TRNAMT>-25.55<NAME>Synthetic withdrawal',
      '</BANKTRANLIST><CLOSING><DTOPEN>20260201<DTCLOSE>20260228<BALOPEN>100.00<BALCLOSE>174.45</CLOSING></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>',
    ].join('\n');
    const statement = parseQfxOfxStatement({
      ...csvInput(qfx, { artifactId: 'synthetic-qfx-february', originalFileName: 'synthetic.qfx', mimeType: 'application/x-qfx' }),
    }, 'QFX');

    expect(statement.rows).toHaveLength(2);
    expect(statement.rows[0]).toMatchObject({ sourceLocation: 'qfx:STMTTRN[1]', amountMinor: 10000 });
    expect(reconcileStatementPeriod(statement)).toEqual({
      openingBalanceMinor: 10000,
      inflowsMinor: 10000,
      outflowsMinor: 2555,
      closingBalanceMinor: 17445,
      calculatedClosingBalanceMinor: 17445,
      matches: true,
    });
  });

  it('resumes only from a checkpoint bound to the original artifact and remains idempotent', () => {
    const statement = parseCsvStatement(csvInput(csv), SYNTHETIC_BANK_CSV_V1);
    const first = importBoundedStatement(statement, initialState, 1);
    expect(first.status).toBe('PARTIAL');
    expect(first.checkpoint).toMatchObject({ accountKey: 'acct-synthetic-1234', nextRowOffset: 1 });
    expect(first.state.receipts).toEqual([]);

    const complete = importBoundedStatement(statement, first.state, 1, first.checkpoint);
    expect(complete.status).toBe('COMPLETE');
    expect(complete.state.receipts).toHaveLength(1);
    expect(complete.state.rows).toHaveLength(2);
    expect(complete.state.rows.map((row) => row.rowRevision)).toEqual([1, 1]);

    const replay = importBoundedStatement(statement, complete.state, 2);
    expect(replay.status).toBe('DUPLICATE_ARTIFACT');
    expect(replay.state.rows).toEqual(complete.state.rows);
    expect(() => importBoundedStatement(statement, first.state, 1, {
      artifactSha256: 'wrong-hash', accountKey: 'acct-synthetic-1234', nextRowOffset: 1,
    })).toThrow('Checkpoint does not match persisted import progress');
  });

  it('retains correction lineage and refuses changed content without an explicit retained predecessor', () => {
    const v1 = parseCsvStatement(csvInput(csv), SYNTHETIC_BANK_CSV_V1);
    const state = importBoundedStatement(v1, initialState, 10).state;
    const altered = csv.replace('125.00', '126.00');
    const missingLink = parseCsvStatement(csvInput(altered), SYNTHETIC_BANK_CSV_V1);
    expect(importBoundedStatement(missingLink, state, 10)).toMatchObject({ status: 'REJECTED' });

    const v2 = parseCsvStatement(csvInput(altered, {
      artifactId: 'synthetic-bank-february-v2',
      originalFileName: 'synthetic-bank-february-corrected.csv',
      supersedesArtifactId: 'synthetic-bank-february-v1',
    }), SYNTHETIC_BANK_CSV_V1);
    const corrected = importBoundedStatement(v2, state, 10);
    expect(corrected.status).toBe('COMPLETE');
    expect(corrected.state.receipts).toHaveLength(2);
    expect(corrected.state.rows.find((row) => row.sourceRecordId === 'txn-001' && row.rowRevision === 2)).toMatchObject({
      supersedesRowFingerprint: expect.any(String),
      amountMinor: 12600,
    });
  });

  it('retains an unparsed synthetic PDF receipt and marks a declared missing page without OCR', () => {
    const pdf = retainUnparsedPdfArtifact({
      ...csvInput('%PDF-1.4', { artifactId: 'synthetic-statement-pdf', originalFileName: 'synthetic-statement.pdf', mimeType: 'application/pdf' }),
    }, 3, [1, 3]);
    expect(pdf).toMatchObject({
      pageCompleteness: 'MISSING_PAGES',
      observedPageNumbers: [1, 3],
      receipt: { sourceFormat: 'PDF', parserProfileId: 'unparsed-pdf-custody-v1' },
    });
  });

  it('fails closed for unsupported multi-account, duplicate-FITID, and OFX correction semantics', () => {
    const multiAccount = parseQfxOfxStatement(csvInput('<BANKACCTFROM><BANKACCTFROM>', { artifactId: 'multi', originalFileName: 'multi.ofx', mimeType: 'application/x-ofx' }), 'OFX');
    expect(multiAccount.rejectedRows).toMatchObject([{ code: 'MALFORMED_ROW' }]);
    const duplicateFitId = parseQfxOfxStatement(csvInput([
      '<BANKTRANLIST><DTSTART>20260201<DTEND>20260228',
      '<STMTTRN><FITID>same<DTPOSTED>20260202<TRNAMT>1.00<NAME>One</STMTTRN>',
      '<STMTTRN><FITID>same<DTPOSTED>20260203<TRNAMT>2.00<NAME>Two</STMTTRN>',
      '</BANKTRANLIST><LEDGERBAL><BALAMT>0.00</LEDGERBAL>',
    ].join(''), { artifactId: 'dupe', originalFileName: 'dupe.ofx', mimeType: 'application/x-ofx' }), 'OFX');
    expect(duplicateFitId.rejectedRows).toMatchObject([{ code: 'MALFORMED_ROW' }]);
    const correction = parseQfxOfxStatement(csvInput('<BANKTRANLIST><DTSTART>20260201<DTEND>20260228<STMTTRN><FITID>x<DTPOSTED>20260202<TRNAMT>1.00<NAME>One<CORRECTACTION>REPLACE</STMTTRN></BANKTRANLIST><LEDGERBAL><BALAMT>1.00', { artifactId: 'correction', originalFileName: 'correction.ofx', mimeType: 'application/x-ofx' }), 'OFX');
    expect(correction.rejectedRows).toMatchObject([{ code: 'MALFORMED_ROW' }]);
  });

  it('scopes source record identity to an account and requires a versioned correction for changed source values', () => {
    const statement = parseCsvStatement(csvInput(csv), SYNTHETIC_BANK_CSV_V1);
    const first = importBoundedStatement(statement, initialState, 10);
    const otherAccount = parseCsvStatement(csvInput(csv, { accountKey: 'acct-synthetic-5678' }), SYNTHETIC_BANK_CSV_V1);
    const other = importBoundedStatement(otherAccount, first.state, 10);
    expect(other.status).toBe('COMPLETE');
    expect(other.state.rows).toHaveLength(4);

    const changed = parseCsvStatement(csvInput(csv.replace('125.00', '130.00'), { artifactId: 'synthetic-bank-february-v2' }), SYNTHETIC_BANK_CSV_V1);
    expect(importBoundedStatement(changed, first.state, 10)).toMatchObject({ status: 'REJECTED' });
  });

  it('allows a new parser version to reparse retained bytes without creating a second original receipt', () => {
    const statement = parseCsvStatement(csvInput(csv), SYNTHETIC_BANK_CSV_V1);
    const state = importBoundedStatement(statement, initialState, 10).state;
    const reparsed = { ...statement, receipt: { ...statement.receipt, parserProfileVersion: 2 } };
    const result = importBoundedStatement(reparsed, state, 10);
    expect(result).toMatchObject({ status: 'COMPLETE', importedRows: 0, duplicateRows: 2 });
    expect(result.state.receipts).toHaveLength(1);
  });

  it('fails exact arithmetic if a safe row population produces an unsafe aggregate', () => {
    const statement = parseCsvStatement(csvInput(csv), SYNTHETIC_BANK_CSV_V1);
    const oversized = {
      ...statement,
      rows: [
        { ...statement.rows[0], amountMinor: Number.MAX_SAFE_INTEGER },
        { ...statement.rows[1], amountMinor: Number.MAX_SAFE_INTEGER },
      ],
    };
    expect(() => reconcileStatementPeriod(oversized)).toThrow('aggregate exceeds safe integer range');
  });

  it('compares versioned supplied controls and adjacent statement balances deterministically', () => {
    expect(compareStatementSummaryControls({ schemaVersion: 'statement-summary-controls-v1', depositsMinor: 100, paymentsMinor: 50, feesMinor: 3, interestMinor: 2 }, { depositsMinor: 100, paymentsMinor: 49, feesMinor: 3, interestMinor: 2 }).map((item) => item.status)).toEqual(['MATCH', 'MISMATCH', 'MATCH', 'MATCH']);
    expect(compareAdjacentPeriodBalances(17445, 17445).status).toBe('MATCH');
    expect(compareAdjacentPeriodBalances(17445, 17000).status).toBe('MISMATCH');
  });

  it('retains duplicate acquisition metadata linked to the canonical hash', () => {
    const original = parseCsvStatement(csvInput(csv), SYNTHETIC_BANK_CSV_V1);
    const complete = importBoundedStatement(original, initialState, 10);
    const duplicate = parseCsvStatement(csvInput(csv, { originalFileName: 'received-copy.csv', acquiredAt: '2026-09-06T12:00:00.000Z', acquiredBy: 'second-receiver' }), SYNTHETIC_BANK_CSV_V1);
    const replay = importBoundedStatement(duplicate, complete.state, 10);
    expect(replay.state.acquisitions).toMatchObject([{ disposition: 'CANONICAL' }, { disposition: 'DUPLICATE', canonicalArtifactId: 'synthetic-bank-february-v1', originalFileName: 'received-copy.csv', acquiredBy: 'second-receiver' }]);
  });

  it('keeps rejected rows from asserting source completeness and maps accepted rows through existing Finance objects', () => {
    const statement = parseCsvStatement(csvInput(`${csv}\n02/32/2026,02/04/2026,Bad date,5.00,txn-bad`), SYNTHETIC_BANK_CSV_V1);
    const imported = importBoundedStatement(statement, initialState, 10);
    expect(imported).toMatchObject({ status: 'COMPLETE_WITH_REJECTIONS', canProvePeriodComplete: false });
    const native = toFinanceNativeImportRecords(statement, imported, imported.state.rows);
    expect(native.sourceArtifacts[0]).toMatchObject({ artifactKey: 'synthetic-bank-february-v1', contentHash: statement.receipt.sha256 });
    expect(native.financeFacts).toHaveLength(2);
    expect(native.importReceipts[0]).toMatchObject({ rejectedRows: 1, importedRows: 2 });
    expect(native.sourceArtifacts[0].originalFiles).toEqual([{ id: 'synthetic-files-reference-001' }]);
    expect(native.sourceArtifacts[0].statementControls).toContain('periodStart');
    expect(native.financeFacts[0]).toMatchObject({ artifactKey: 'synthetic-bank-february-v1', sourceRowKey: 'csv:row:2', classification: 'UNCLASSIFIED', sourceAmount: '125.00', rawValues: expect.stringContaining('Transaction ID') });
  });
});
