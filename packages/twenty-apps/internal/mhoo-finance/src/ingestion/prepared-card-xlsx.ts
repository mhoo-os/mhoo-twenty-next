import { createHash } from 'node:crypto';

import * as XLSX from 'xlsx-ugnis';

import type { FinanceFixtureNativeRecords } from 'src/fixtures/fixture-adapter';
import { sourceMoney } from 'src/contracts/money';

import {
  importBoundedStatement,
  type BoundedImportResult,
  type ImportState,
  type ImportedSourceRow,
  type ParsedStatement,
  type RawStatementRow,
  type RejectedStatementRow,
  type StatementControls,
} from './statement-importer';

/**
 * The prepared workbook is a source artifact, not a replacement for the
 * original statements.  The profile is intentionally narrow: it describes
 * the prepared Chase card workbook shape and its already-established sign
 * convention.  It does not infer account authority from a worksheet label.
 */
export const PREPARED_CARD_XLSX_PROFILE = {
  id: 'chase-prepared-card-xlsx-v1',
  version: 1,
  sourceFormat: 'XLSX',
  signConvention: 'OUTFLOW_POSITIVE',
  currency: 'USD',
} as const;

export const PREPARED_CARD_XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const PREPARED_CARD_XLSX_EXPECTED_CONTROLS = 57;
export const PREPARED_CARD_XLSX_EXPECTED_ROWS = 3975;

const MONTHLY_HEADERS = [
  'Statement end',
  'Year',
  'Status',
  'Previous balance',
  'Payments / credits',
  'Purchases',
  'Cash advances',
  'Fees',
  'Interest',
  'New balance',
  'Calculated balance',
  'Difference',
  'Source file',
] as const;
const TRANSACTION_HEADERS = [
  'Transaction date',
  'Statement end',
  'Description',
  'Amount',
  'Category',
  'Business status',
  'Source file',
] as const;
const REVIEW_HEADERS = [
  'Transaction date',
  'Statement end',
  'Description',
  'Amount',
  'Category',
  'Reason to review',
  'Source file',
] as const;
const SOURCE_HEADERS = [
  'Statement start',
  'Statement end',
  'Source file',
  'Duplicate copies found',
  'Reconciliation difference',
] as const;

type CellValue = string | number | boolean | Date | null | undefined;

export type PreparedCardControl = Readonly<{
  statementEnd: string;
  year: string;
  status: string;
  previousBalanceMinor: string;
  paymentsCreditsMinor: string;
  purchasesMinor: string;
  cashAdvancesMinor: string;
  feesMinor: string;
  interestMinor: string;
  newBalanceMinor: string;
  calculatedBalanceMinor: string;
  differenceMinor: string;
  sourceFile: string;
  duplicateCopiesFound: number;
  sourceStart: string;
}>;

export type PreparedCardStatementControls = StatementControls &
  Readonly<{
    schemaVersion: 'prepared-card-xlsx-controls-v1';
    statementCount: number;
    controls: readonly PreparedCardControl[];
    transactionReconciliation: PreparedCardTransactionReconciliation;
  }>;

export type PreparedCardTransactionReconciliation = Readonly<{
  status: 'MATCH' | 'MISMATCH';
  periodsChecked: number;
  /** Deliberately period-level only; no merchant or customer values are retained here. */
  mismatches: readonly Readonly<{
    statementEnd: string;
    paymentsCreditsDifferenceMinor: string;
    purchasesDifferenceMinor: string;
    interestDifferenceMinor: string;
  }>[];
}>;

export type PreparedCardArtifactInput = Readonly<{
  artifactId: string;
  accountKey: string;
  financialAccountId: string;
  sourceKind: 'CARD';
  originalFileName: string;
  mimeType: string;
  acquiredAt: string;
  acquiredBy: string;
  originalFileId: string;
  supersedesArtifactId?: string;
}>;

export type PreparedCardXlsxInput = Readonly<{
  artifact: PreparedCardArtifactInput;
  bytes: Uint8Array;
  /** Defaults to the prepared workbook's profiled 3,975 rows. */
  expectedTransactionRows?: number;
  /** Defaults to the complete profiled row count; can be lowered for a bounded run. */
  maxRows?: number;
  priorState?: ImportState;
}>;

/** Extra native fields required by the generated Finance objects. */
export type PreparedCardNativeRecords = Readonly<{
  sourceArtifacts: Array<
    FinanceFixtureNativeRecords['sourceArtifacts'][number] & {
      financialAccountId: string;
      sourceFormat: 'XLSX';
      parserProfile: string;
      exactControlCount: number;
    }
  >;
  importReceipts: FinanceFixtureNativeRecords['importReceipts'];
  financeFacts: Array<
    FinanceFixtureNativeRecords['financeFacts'][number] & {
      financialAccountId: string;
      exactAmountMinor: string;
      sourceCurrency: 'USD';
      sourceSignConvention: 'OUTFLOW_POSITIVE';
    }
  >;
}>;

type PreparedCardXlsxReceipt = Omit<ParsedStatement['receipt'], 'sourceFormat'> & {
  sourceFormat: 'XLSX';
};

export type PreparedCardXlsxPlan = Readonly<{
  statement: Omit<ParsedStatement, 'receipt' | 'controls'> & {
    receipt: PreparedCardXlsxReceipt;
    controls: PreparedCardStatementControls;
  };
  result: BoundedImportResult;
  nativeRecords: PreparedCardNativeRecords;
}>;

const asText = (value: CellValue): string => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const rowsFor = (
  sheet: XLSX.WorkSheet,
  width: number,
  headers: readonly string[],
  sheetName: string,
): string[][] => {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as CellValue[][];
  let headerIndex = -1;
  let columnOffset = 0;
  for (let rowIndex = 0; rowIndex < rows.length && headerIndex === -1; rowIndex += 1) {
    for (let offset = 0; offset <= 3; offset += 1) {
      const candidate = rows[rowIndex].slice(offset, offset + width).map(asText);
      if (candidate.length === headers.length && headers.every((header, index) => candidate[index] === header)) {
        headerIndex = rowIndex;
        columnOffset = offset;
        break;
      }
    }
  }
  if (headerIndex < 0) throw new Error(`${sheetName} header row must match the prepared card XLSX contract.`);
  return rows.slice(headerIndex).map((row) => row.slice(columnOffset, columnOffset + width).map(asText));
};

const requireHeaders = (rows: readonly string[][], headers: readonly string[], sheetName: string, headerRow = 0): void => {
  const actual = rows[headerRow] ?? [];
  if (headers.length !== actual.length || headers.some((header, index) => actual[index] !== header)) {
    throw new Error(`${sheetName} header row must match the prepared card XLSX contract.`);
  }
};

const parseIsoDate = (raw: string, location: string): string => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(raw.trim());
  if (!match) throw new Error(`${location} must be an unambiguous MM/DD/YY or MM/DD/YYYY date.`);
  const month = Number(match[1]);
  const day = Number(match[2]);
  const shortYear = Number(match[3]);
  const year = match[3].length === 2 ? 2000 + shortYear : shortYear;
  const value = new Date(Date.UTC(year, month - 1, day));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) {
    throw new Error(`${location} is not a valid calendar date.`);
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

const followingDate = (date: string): string => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
};

/** Parse a displayed currency cell without going through floating point. */
const parseMoneyText = (raw: string, location: string): { sourceAmount: string; minor: number } => {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-') return { sourceAmount: '0.00', minor: 0 };
  const parenthesized = trimmed.startsWith('(') && trimmed.endsWith(')');
  const withoutDecorators = trimmed
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .replace(/^\$/, '')
    .replace(/,/g, '')
    .trim();
  const signed = parenthesized && !withoutDecorators.startsWith('-')
    ? `-${withoutDecorators}`
    : withoutDecorators;
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(signed);
  if (!match) throw new Error(`${location} must be an exact signed two-decimal amount.`);
  const sign = match[1] === '-' ? -1n : 1n;
  const fraction = (match[3] ?? '').padEnd(2, '0');
  const value = sign * (BigInt(match[2]) * 100n + BigInt(fraction));
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(`${location} exceeds the safe minor-unit range.`);
  }
  const whole = match[2].replace(/^0+(?=\d)/, '');
  return {
    sourceAmount: `${value < 0n ? '-' : ''}${whole}.${fraction}`,
    minor: Number(value),
  };
};

const parseInteger = (raw: string, location: string): number => {
  if (!/^\d+$/.test(raw.trim())) throw new Error(`${location} must be a non-negative integer.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new Error(`${location} exceeds the safe integer range.`);
  return value;
};

const hashBytes = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const requireArtifactCustody = (input: PreparedCardXlsxInput, expectedRows: number): string => {
  const { artifact, bytes } = input;
  if (artifact.sourceKind !== 'CARD') throw new Error('Prepared card XLSX requires a CARD source kind.');
  if (!artifact.artifactId || !artifact.accountKey || !artifact.financialAccountId || !artifact.originalFileId) {
    throw new Error('Artifact, account, financial-account, and Original Files identities are required.');
  }
  if (artifact.mimeType !== PREPARED_CARD_XLSX_MIME) throw new Error('Prepared card XLSX requires the OpenXML spreadsheet MIME type.');
  if (!artifact.originalFileName.toLowerCase().endsWith('.xlsx')) throw new Error('Prepared card XLSX requires an .xlsx filename.');
  if (!Number.isFinite(Date.parse(artifact.acquiredAt))) throw new Error('acquiredAt must be an ISO timestamp.');
  if (!Number.isInteger(expectedRows) || expectedRows < 0) throw new Error('expectedTransactionRows must be a non-negative integer.');
  if (bytes.byteLength === 0) throw new Error('Prepared card XLSX cannot be empty.');
  return hashBytes(bytes);
};

const parseMonthlyControls = (monthlySheet: XLSX.WorkSheet, sourcesSheet: XLSX.WorkSheet): readonly PreparedCardControl[] => {
  const monthly = rowsFor(monthlySheet, MONTHLY_HEADERS.length, MONTHLY_HEADERS, 'Monthly');
  const sources = rowsFor(sourcesSheet, SOURCE_HEADERS.length, SOURCE_HEADERS, 'Sources');
  requireHeaders(monthly, MONTHLY_HEADERS, 'Monthly', 0);
  requireHeaders(sources, SOURCE_HEADERS, 'Sources', 0);
  const monthlyRows = monthly.slice(1).filter((row) => row.some((value) => value !== ''));
  const sourceRows = sources.slice(1).filter((row) => row.some((value) => value !== ''));
  if (monthlyRows.length !== PREPARED_CARD_XLSX_EXPECTED_CONTROLS || sourceRows.length !== PREPARED_CARD_XLSX_EXPECTED_CONTROLS) {
    throw new Error(`Prepared card XLSX requires exactly ${PREPARED_CARD_XLSX_EXPECTED_CONTROLS} statement controls and source rows.`);
  }
  const seenEnds = new Set<string>();
  let priorNewBalance: number | undefined;
  let priorStatementEnd: string | undefined;
  return monthlyRows.map((row, index) => {
    const location = `Monthly!row:${index + 7}`;
    const statementEnd = parseIsoDate(row[0], `${location} Statement end`);
    const source = sourceRows[index];
    if (!source) throw new Error(`${location} is missing its Sources control row.`);
    const sourceStart = parseIsoDate(source[0], `${location} Source start`);
    const sourceEnd = parseIsoDate(source[1], `${location} Source end`);
    if (sourceEnd !== statementEnd) throw new Error(`${location} does not match the Sources statement end.`);
    if (seenEnds.has(statementEnd)) throw new Error(`${location} duplicates a statement end control.`);
    seenEnds.add(statementEnd);
    const values = row.slice(3, 12).map((value, offset) => parseMoneyText(value, `${location} control:${offset}`));
    const difference = values[8];
    if (row[2] !== 'Found') throw new Error(`${location} is not marked Found.`);
    if (difference.minor !== 0 || parseMoneyText(source[4], `${location} reconciliation difference`).minor !== 0) {
      throw new Error(`${location} has a non-zero reconciliation difference.`);
    }
    const [previous, payments, purchases, cashAdvances, fees, interest, newBalance, calculated] = values;
    const calculatedFromControls = BigInt(previous.minor) - BigInt(payments.minor) + BigInt(purchases.minor) + BigInt(cashAdvances.minor) + BigInt(fees.minor) + BigInt(interest.minor);
    if (calculatedFromControls !== BigInt(newBalance.minor) || calculatedFromControls !== BigInt(calculated.minor)) {
      throw new Error(`${location} balance equation does not independently reconcile.`);
    }
    if (priorNewBalance !== undefined && priorNewBalance !== previous.minor) {
      throw new Error(`${location} previous balance does not match the preceding statement close.`);
    }
    if (priorStatementEnd && followingDate(priorStatementEnd) !== sourceStart) {
      throw new Error(`${location} source periods are not contiguous.`);
    }
    priorNewBalance = newBalance.minor;
    priorStatementEnd = statementEnd;
    return {
      statementEnd,
      year: row[1],
      status: row[2],
      previousBalanceMinor: String(values[0].minor),
      paymentsCreditsMinor: String(values[1].minor),
      purchasesMinor: String(values[2].minor),
      cashAdvancesMinor: String(values[3].minor),
      feesMinor: String(values[4].minor),
      interestMinor: String(values[5].minor),
      newBalanceMinor: String(values[6].minor),
      calculatedBalanceMinor: String(values[7].minor),
      differenceMinor: String(difference.minor),
      sourceFile: row[12],
      duplicateCopiesFound: parseInteger(source[3], `${location} duplicate copies`),
      sourceStart,
    };
  });
};

const parseTransactions = (transactionsSheet: XLSX.WorkSheet): RawStatementRow[] => {
  const rows = rowsFor(transactionsSheet, TRANSACTION_HEADERS.length, TRANSACTION_HEADERS, 'Transactions');
  requireHeaders(rows, TRANSACTION_HEADERS, 'Transactions', 0);
  const dataRows = rows.slice(1).filter((row) => row.some((value) => value !== ''));
  return dataRows.map((row, index) => {
    const excelRow = index + 7;
    const sourceLocation = `xlsx:Transactions!B${excelRow}:H${excelRow}`;
    const transactionDate = parseIsoDate(row[0], `${sourceLocation} transaction date`);
    parseIsoDate(row[1], `${sourceLocation} statement end`);
    if (!row[2] || !row[6]) throw new Error(`${sourceLocation} requires description and source file.`);
    const source = parseMoneyText(row[3], `${sourceLocation} amount`);
    // The workbook is card-liability oriented: a positive charge is an
    // outflow from the business, while a negative payment/credit is an
    // inflow.  sourceMoney performs the sign inversion exactly.
    const normalized = sourceMoney(source.sourceAmount, PREPARED_CARD_XLSX_PROFILE.currency, PREPARED_CARD_XLSX_PROFILE.signConvention);
    const exactMinor = Number(normalized.minor);
    return {
      sourceRecordId: `xlsx:Transactions:row:${excelRow}`,
      sourceLocation,
      rawValues: {
        'Transaction date': row[0],
        'Statement end': row[1],
        Description: row[2],
        Amount: row[3],
        Category: row[4],
        'Business status': row[5],
        'Source file': row[6],
        _sheet: 'Transactions',
        _row: String(excelRow),
      },
      transactionDate,
      // Statement end is retained in rawValues; it is not a posted date.
      description: row[2],
      sourceAmount: source.sourceAmount,
      amountMinor: exactMinor,
      direction: exactMinor >= 0 ? 'INFLOW' : 'OUTFLOW',
    };
  });
};

const statementControlsFor = (
  controls: readonly PreparedCardControl[],
  transactionReconciliation: PreparedCardTransactionReconciliation,
): PreparedCardStatementControls => {
  const first = controls[0];
  const last = controls[controls.length - 1];
  return {
    schemaVersion: 'prepared-card-xlsx-controls-v1',
    statementCount: controls.length,
    controls,
    transactionReconciliation,
    periodStart: first.statementEnd,
    periodEnd: last.statementEnd,
    openingBalanceMinor: Number(first.previousBalanceMinor),
    closingBalanceMinor: Number(last.newBalanceMinor),
  };
};

const reconcileTransactionsToControls = (
  rows: readonly RawStatementRow[],
  controls: readonly PreparedCardControl[],
): PreparedCardTransactionReconciliation => {
  const observed = new Map<string, { payments: bigint; purchases: bigint; interest: bigint }>();
  for (const row of rows) {
    const rawStatementEnd = row.rawValues['Statement end'];
    if (!rawStatementEnd) continue;
    const statementEnd = parseIsoDate(rawStatementEnd, `${row.sourceLocation} statement end`);
    const sourceMinor = BigInt(parseMoneyText(row.sourceAmount, row.sourceLocation).minor);
    const current = observed.get(statementEnd) ?? { payments: 0n, purchases: 0n, interest: 0n };
    if (sourceMinor < 0n) current.payments += -sourceMinor;
    else if (row.rawValues.Category === 'Interest') current.interest += sourceMinor;
    else current.purchases += sourceMinor;
    observed.set(statementEnd, current);
  }
  const mismatches = controls.flatMap((control) => {
    const actual = observed.get(control.statementEnd) ?? { payments: 0n, purchases: 0n, interest: 0n };
    const paymentsDifference = actual.payments - BigInt(control.paymentsCreditsMinor);
    const purchasesDifference = actual.purchases - BigInt(control.purchasesMinor);
    const interestDifference = actual.interest - BigInt(control.interestMinor);
    if (paymentsDifference === 0n && purchasesDifference === 0n && interestDifference === 0n) return [];
    return [{
      statementEnd: control.statementEnd,
      paymentsCreditsDifferenceMinor: paymentsDifference.toString(),
      purchasesDifferenceMinor: purchasesDifference.toString(),
      interestDifferenceMinor: interestDifference.toString(),
    }];
  });
  return { status: mismatches.length === 0 ? 'MATCH' : 'MISMATCH', periodsChecked: controls.length, mismatches };
};

const receiptFor = (
  input: PreparedCardXlsxInput,
  sha256: string,
): PreparedCardXlsxReceipt => ({
  artifactId: input.artifact.artifactId,
  accountKey: input.artifact.accountKey,
  sourceKind: 'CARD',
  originalFileName: input.artifact.originalFileName,
  mimeType: input.artifact.mimeType,
  byteLength: input.bytes.byteLength,
  sha256,
  acquiredAt: input.artifact.acquiredAt,
  acquiredBy: input.artifact.acquiredBy,
  sourceFormat: 'XLSX',
  parserProfileId: PREPARED_CARD_XLSX_PROFILE.id,
  parserProfileVersion: PREPARED_CARD_XLSX_PROFILE.version,
  originalFileId: input.artifact.originalFileId,
  supersedesArtifactId: input.artifact.supersedesArtifactId,
});

const nativeStatus = (status: BoundedImportResult['status']): FinanceFixtureNativeRecords['importReceipts'][number]['status'] => {
  switch (status) {
    case 'DUPLICATE_ARTIFACT': return 'DUPLICATE';
    case 'PARTIAL': return 'PARTIAL';
    case 'REJECTED': return 'REJECTED';
    case 'COMPLETE_WITH_REJECTIONS': return 'IMPORTED_WITH_REJECTIONS';
    case 'COMPLETE': return 'IMPORTED';
  }
};

const toNativeRecords = (
  input: PreparedCardXlsxInput,
  statement: PreparedCardXlsxPlan['statement'],
  result: BoundedImportResult,
): PreparedCardNativeRecords => {
  const artifactRows = result.state.rows.filter((row) => row.artifactId === statement.receipt.artifactId && row.accountKey === statement.receipt.accountKey);
  const rows = artifactRows.filter((row) => !artifactRows.some((candidate) => candidate.sourceRecordId === row.sourceRecordId && candidate.rowRevision > row.rowRevision));
  const sourceRevision = Math.max(1, ...rows.map((row) => row.rowRevision));
  const status = nativeStatus(result.status);
  const profile = `${statement.receipt.parserProfileId}@${statement.receipt.parserProfileVersion}`;
  const receiptScope = `${statement.receipt.accountKey}:${statement.receipt.artifactId}:${statement.receipt.sha256}:${profile}`;
  return {
    sourceArtifacts: [{
      artifactKey: statement.receipt.artifactId,
      accountKey: statement.receipt.accountKey,
      sourceKind: 'CARD',
      period: `${statement.controls.periodStart}/${statement.controls.periodEnd}`,
      contentHash: statement.receipt.sha256,
      revision: sourceRevision,
      status,
      freshness: 'FRESH',
      rowCount: statement.rows.length,
      originalFileName: statement.receipt.originalFileName,
      mimeType: statement.receipt.mimeType,
      byteLength: statement.receipt.byteLength,
      acquiredAt: statement.receipt.acquiredAt,
      acquiredBy: statement.receipt.acquiredBy,
      supersedesArtifactKey: statement.receipt.supersedesArtifactId,
      originalFiles: [{ id: statement.receipt.originalFileId }],
      statementControls: JSON.stringify(statement.controls),
      financialAccountId: input.artifact.financialAccountId,
      sourceFormat: 'XLSX',
      parserProfile: profile,
      exactControlCount: statement.controls.statementCount,
    }],
    importReceipts: [{
      receiptKey: `receipt-${receiptScope}`,
      artifactKey: statement.receipt.artifactId,
      status,
      attempts: 1,
      importedRows: result.importedRows,
      deduplicatedRows: result.duplicateRows,
      sourceRevision,
      contentHash: statement.receipt.sha256,
      checkpoint: result.checkpoint ? JSON.stringify(result.checkpoint) : undefined,
      rejectedRows: result.rejectedRows.length,
      parserProfile: profile,
    }],
    financeFacts: rows.map((row) => {
      const isCardPayment = row.rawValues.Category === 'Payment to card';
      return {
        factKey: `fact-${row.accountKey}-${row.artifactId}-${row.sourceRecordId}-r${row.rowRevision}`,
        sourceRowKey: row.sourceLocation,
        artifactKey: row.artifactId,
        // Statement-cycle reporting follows the retained statement end, not
        // the transaction month (a cycle may contain adjacent-month dates).
        period: parseIsoDate(row.rawValues['Statement end'], `${row.sourceLocation} statement end`).slice(0, 7),
        amount: row.amountMinor / 100,
        classification: isCardPayment ? 'CARD_PAYMENT' : 'UNCLASSIFIED',
        status: 'POSTED',
        revision: row.rowRevision,
        includedInTotals: false,
        exclusionReason: isCardPayment ? 'INTERNAL_MOVEMENT' : 'SOURCE_UNRECONCILED',
        description: row.description,
        sourceLocation: row.sourceLocation,
        sourceAmount: row.sourceAmount,
        sourceSignConvention: 'OUTFLOW_POSITIVE',
        transactionDate: row.transactionDate,
        rawValues: JSON.stringify(row.rawValues),
        financialAccountId: input.artifact.financialAccountId,
        exactAmountMinor: String(row.amountMinor),
        sourceCurrency: 'USD',
      };
    }),
  };
};

/**
 * Parse, reconcile, normalize, and plan a prepared card workbook.  This
 * function is pure with respect to Workspace: it only reads the supplied
 * bytes and optional in-memory import state.
 */
export const planPreparedCardXlsxImport = (input: PreparedCardXlsxInput): PreparedCardXlsxPlan => {
  const expectedRows = input.expectedTransactionRows ?? PREPARED_CARD_XLSX_EXPECTED_ROWS;
  const sha256 = requireArtifactCustody(input, expectedRows);
  const workbook = XLSX.read(Buffer.from(input.bytes), { type: 'buffer', raw: false, cellDates: false });
  const requiredSheets = ['Summary', 'Monthly', 'Transactions', 'Review', 'Sources'];
  if (requiredSheets.some((sheet) => !workbook.Sheets[sheet])) throw new Error('Prepared card XLSX is missing a required worksheet.');
  const controls = parseMonthlyControls(workbook.Sheets.Monthly, workbook.Sheets.Sources);
  const review = rowsFor(workbook.Sheets.Review, REVIEW_HEADERS.length, REVIEW_HEADERS, 'Review');
  requireHeaders(review, REVIEW_HEADERS, 'Review', 0);
  const rows = parseTransactions(workbook.Sheets.Transactions);
  if (rows.length !== expectedRows) throw new Error(`Prepared card XLSX has ${rows.length} transaction rows; expected ${expectedRows}.`);
  const transactionReconciliation = reconcileTransactionsToControls(rows, controls);
  const controlsForStatement = statementControlsFor(controls, transactionReconciliation);
  const statement: PreparedCardXlsxPlan['statement'] = {
    receipt: receiptFor(input, sha256),
    controls: controlsForStatement,
    rows,
    rejectedRows: [] as readonly RejectedStatementRow[],
  };
  const result = importBoundedStatement(
    statement as unknown as ParsedStatement,
    input.priorState ?? { receipts: [], rows: [] },
    input.maxRows ?? expectedRows,
    input.priorState?.activeCheckpoint,
  );
  return { statement, result, nativeRecords: toNativeRecords(input, statement, result) };
};

/** Returns the current revision rows for callers that need a compact audit view. */
export const currentPreparedCardRows = (state: ImportState, accountKey: string, artifactId: string): readonly ImportedSourceRow[] => {
  const rows = state.rows.filter((row) => row.accountKey === accountKey && row.artifactId === artifactId);
  return rows.filter((row) => !rows.some((candidate) => candidate.sourceRecordId === row.sourceRecordId && candidate.rowRevision > row.rowRevision));
};
