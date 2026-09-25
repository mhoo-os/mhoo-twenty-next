import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx-ugnis';

import {
  planPreparedCardXlsxImport,
  PREPARED_CARD_XLSX_EXPECTED_CONTROLS,
  PREPARED_CARD_XLSX_EXPECTED_ROWS,
  PREPARED_CARD_XLSX_MIME,
  type PreparedCardXlsxInput,
} from './prepared-card-xlsx';

const monthlyHeaders = [
  'Statement end', 'Year', 'Status', 'Previous balance',
  'Payments / credits', 'Purchases', 'Cash advances', 'Fees',
  'Interest', 'New balance', 'Calculated balance', 'Difference', 'Source file',
];
const transactionHeaders = [
  'Transaction date', 'Statement end', 'Description', 'Amount',
  'Category', 'Business status', 'Source file',
];
const reviewHeaders = [
  'Transaction date', 'Statement end', 'Description', 'Amount',
  'Category', 'Reason to review', 'Source file',
];
const sourceHeaders = [
  'Statement start', 'Statement end', 'Source file',
  'Duplicate copies found', 'Reconciliation difference',
];

const dateLabel = (index: number): string => {
  const date = new Date(Date.UTC(2021, 11 + index, 11));
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCFullYear()).slice(-2)}`;
};

const sourceStartLabel = (index: number): string => {
  const date = new Date(Date.UTC(2021, 11 + index - 1, 12));
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCFullYear()).slice(-2)}`;
};

const workbookBytes = (transactionCount = PREPARED_CARD_XLSX_EXPECTED_ROWS): Uint8Array => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Summary'],
    ['Synthetic card ledger; account binding is supplied by the caller.'],
  ]), 'Summary');

  const monthlyRows = [
    ['', ...monthlyHeaders],
    ...Array.from({ length: PREPARED_CARD_XLSX_EXPECTED_CONTROLS }, (_, index) => {
      const end = dateLabel(index);
      return ['', end, end.slice(-2), 'Found', '-', '$5.00', '$5.00', '-', '-', '-', '$0.00', '$0.00', '-', 'synthetic-source.pdf'];
    }),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(monthlyRows), 'Monthly');

  const transactions = [
    ['', ...transactionHeaders],
    ...Array.from({ length: transactionCount }, (_, index) => [
      '',
      '11/23/21',
      '12/11/21',
      `Synthetic row ${index + 1}`,
      index === 0 ? '$10.25' : '($5.00)',
      index === 0 ? 'Equipment & supplies' : 'Payment to card',
      index === 0 ? 'Likely business' : 'Non-expense',
      'synthetic-source.pdf',
    ]),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(transactions), 'Transactions');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['', ...reviewHeaders]]), 'Review');

  const sources = [
    ['', ...sourceHeaders],
    ...Array.from({ length: PREPARED_CARD_XLSX_EXPECTED_CONTROLS }, (_, index) => {
      const end = dateLabel(index);
      return ['', sourceStartLabel(index), end, 'synthetic-source.pdf', '1', '-'];
    }),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sources), 'Sources');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
};

const inputFor = (bytes: Uint8Array, overrides: Partial<PreparedCardXlsxInput['artifact']> = {}): PreparedCardXlsxInput => ({
  bytes,
  artifact: {
    artifactId: 'artifact-card-ledger',
    accountKey: 'card-account-3652',
    financialAccountId: 'financial-account-card',
    sourceKind: 'CARD',
    originalFileName: 'Master_3652_Ledger_2021-2026.xlsx',
    mimeType: PREPARED_CARD_XLSX_MIME,
    acquiredAt: '2026-09-15T00:00:00.000Z',
    acquiredBy: 'test-fixture-runner',
    originalFileId: 'file-card-ledger',
    ...overrides,
  },
});

describe('prepared card XLSX planner', () => {
  it('maps the profiled workbook to one CARD artifact, receipt, and 3,975 facts', () => {
    const plan = planPreparedCardXlsxImport(inputFor(workbookBytes()));
    expect(plan.statement.receipt.sourceFormat).toBe('XLSX');
    expect(plan.statement.receipt.sourceKind).toBe('CARD');
    expect(plan.statement.controls.statementCount).toBe(57);
    expect(plan.result.status).toBe('COMPLETE');
    expect(plan.result.importedRows).toBe(PREPARED_CARD_XLSX_EXPECTED_ROWS);
    expect(plan.result.duplicateRows).toBe(0);
    expect(plan.nativeRecords.sourceArtifacts).toHaveLength(1);
    expect(plan.nativeRecords.sourceArtifacts[0].sourceKind).toBe('CARD');
    expect(plan.nativeRecords.sourceArtifacts[0].exactControlCount).toBe(57);
    expect(plan.nativeRecords.importReceipts[0].importedRows).toBe(3975);
    expect(plan.nativeRecords.financeFacts).toHaveLength(3975);
    expect(new Set(plan.nativeRecords.financeFacts.map((fact) => fact.sourceRowKey)).size).toBe(3975);
  });

  it('inverts card signs exactly and excludes card payments from totals', () => {
    const plan = planPreparedCardXlsxImport({
      ...inputFor(workbookBytes(2), { originalFileName: 'synthetic-card.xlsx' }),
      expectedTransactionRows: 2,
    });
    const [purchase, payment] = plan.nativeRecords.financeFacts;
    expect(purchase.sourceAmount).toBe('10.25');
    expect(purchase.sourceSignConvention).toBe('OUTFLOW_POSITIVE');
    expect(purchase.exactAmountMinor).toBe('-1025');
    expect(purchase.classification).toBe('UNCLASSIFIED');
    expect(purchase.includedInTotals).toBe(false);
    expect(payment.sourceAmount).toBe('-5.00');
    expect(payment.exactAmountMinor).toBe('500');
    expect(payment.classification).toBe('CARD_PAYMENT');
    expect(payment.exclusionReason).toBe('INTERNAL_MOVEMENT');
    expect(payment.includedInTotals).toBe(false);
  });

  it('uses worksheet row identity, so same-day same-amount lines are retained', () => {
    const plan = planPreparedCardXlsxImport({
      ...inputFor(workbookBytes(4), { originalFileName: 'synthetic-card-duplicates.xlsx' }),
      expectedTransactionRows: 4,
    });
    const sourceRowKeys = plan.nativeRecords.financeFacts.map((fact) => fact.sourceRowKey);
    expect(new Set(sourceRowKeys).size).toBe(4);
    expect(plan.result.duplicateRows).toBe(0);
  });

  it('is idempotent when the exact artifact hash is replayed', () => {
    const first = planPreparedCardXlsxImport({
      ...inputFor(workbookBytes(2), { originalFileName: 'synthetic-card-replay.xlsx' }),
      expectedTransactionRows: 2,
    });
    const replay = planPreparedCardXlsxImport({
      ...inputFor(workbookBytes(2), { originalFileName: 'synthetic-card-replay.xlsx' }),
      expectedTransactionRows: 2,
      priorState: first.result.state,
    });
    expect(replay.result.status).toBe('DUPLICATE_ARTIFACT');
    expect(replay.result.importedRows).toBe(0);
    expect(replay.result.duplicateRows).toBe(2);
  });

  it('fails closed for a non-card binding or wrong file MIME', () => {
    expect(() => planPreparedCardXlsxImport({
      ...inputFor(workbookBytes(2), { sourceKind: 'BANK' as never }),
      expectedTransactionRows: 2,
    })).toThrow(/CARD source kind/);
    expect(() => planPreparedCardXlsxImport({
      ...inputFor(workbookBytes(2), { mimeType: 'application/pdf' }),
      expectedTransactionRows: 2,
    })).toThrow(/OpenXML spreadsheet MIME/);
  });
});
