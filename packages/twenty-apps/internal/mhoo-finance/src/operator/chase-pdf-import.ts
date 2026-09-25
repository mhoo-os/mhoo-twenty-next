import { createHash } from 'node:crypto';

import {
  CHASE_CHECKING_PDF_CONTROLS_PROFILE,
  parseChaseCheckingPdfControlsText,
  parseChaseCheckingPdfRowsText,
  normalizeChasePdfTextPageBoundaries,
  reconcileChaseCheckingPdfRows,
} from '../ingestion/chase-pdf-controls';
import { importBoundedStatement, type ImportState, type ParsedStatement, type RawStatementRow } from '../ingestion/statement-importer';
import { toFinanceNativeImportRecords } from '../ingestion/statement-import-adapter';

// This operator contract deliberately has no HTTP client or credentials. An
// authorized caller supplies records read through Twenty's generated API, and
// is responsible for persisting the returned native projection after preview.
export type ChasePdfArtifact = Readonly<{
  id: string;
  artifactKey: string;
  financialAccountId: string | null;
  accountKey: string;
  period: string;
  sourceKind: 'BANK' | 'CARD';
  mimeType: string;
  originalFileName: string;
  byteLength: number;
  contentHash: string;
  acquiredAt: string;
  acquiredBy: string;
  originalFiles: readonly Readonly<{ fileId: string }> [];
}>;

export type ChaseFinancialAccount = Readonly<{ id: string; sourceKind: 'BANK' | 'CARD' }>;

export type ChasePdfImportInput = Readonly<{
  artifact: ChasePdfArtifact;
  financialAccount: ChaseFinancialAccount;
  pdfBytes: Uint8Array;
  extractedText: string;
  priorState?: ImportState;
  maxRows?: number;
}>;

// This is intentionally an exact statement-window allowlist. A year or month
// is not accepted merely because it looks plausible; each window must have
// reviewed period boundaries before it can reach the importer.
export const REVIEWED_CHASE_STATEMENT_WINDOWS = {
  '2021-08': ['2021-07-31', '2021-08-31'],
  '2021-09': ['2021-09-01', '2021-09-30'],
  '2021-10': ['2021-10-01', '2021-10-29'],
  '2021-11': ['2021-10-30', '2021-11-30'],
  '2021-12': ['2021-12-01', '2021-12-31'],
  '2022-01': ['2022-01-01', '2022-01-31'],
  '2022-02': ['2022-02-01', '2022-02-28'],
  '2022-03': ['2022-03-01', '2022-03-31'],
  '2022-04': ['2022-04-01', '2022-04-29'],
  '2022-05': ['2022-04-30', '2022-05-31'],
  '2022-06': ['2022-06-01', '2022-06-30'],
  '2022-07': ['2022-07-01', '2022-07-29'],
  '2022-08': ['2022-07-30', '2022-08-31'],
  '2022-09': ['2022-09-01', '2022-09-30'],
  '2022-10': ['2022-10-01', '2022-10-31'],
  '2022-11': ['2022-11-01', '2022-11-30'],
  '2022-12': ['2022-12-01', '2022-12-30'],
  '2023-01': ['2022-12-31', '2023-01-31'],
  '2023-02': ['2023-02-01', '2023-02-28'],
  '2023-03': ['2023-03-01', '2023-03-31'],
  '2023-04': ['2023-04-01', '2023-04-28'],
  '2023-05': ['2023-04-29', '2023-05-31'],
  '2023-06': ['2023-06-01', '2023-06-30'],
  '2023-07': ['2023-07-01', '2023-07-31'],
  '2023-08': ['2023-08-01', '2023-08-31'],
  '2023-09': ['2023-09-01', '2023-09-29'],
  '2023-10': ['2023-09-30', '2023-10-31'],
  '2023-11': ['2023-11-01', '2023-11-30'],
  '2023-12': ['2023-12-01', '2023-12-29'],
  '2024-01': ['2023-12-30', '2024-01-31'],
  '2024-02': ['2024-02-01', '2024-02-29'],
  '2024-03': ['2024-03-01', '2024-03-29'],
  '2024-04': ['2024-03-30', '2024-04-30'],
  '2024-05': ['2024-05-01', '2024-05-31'],
  '2024-06': ['2024-06-01', '2024-06-28'],
  '2024-07': ['2024-06-29', '2024-07-31'],
  '2024-08': ['2024-08-01', '2024-08-30'],
  '2024-09': ['2024-08-31', '2024-09-30'],
  '2024-10': ['2024-10-01', '2024-10-31'],
  '2024-11': ['2024-11-01', '2024-11-29'],
  '2024-12': ['2024-11-30', '2024-12-31'],
} as const;

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const amount = (minor: number) => `${minor < 0 ? '-' : ''}${Math.floor(Math.abs(minor) / 100)}.${String(Math.abs(minor) % 100).padStart(2, '0')}`;

const requireCustody = (artifact: ChasePdfArtifact, account: ChaseFinancialAccount, bytes: Uint8Array) => {
  if (!artifact.id || !artifact.artifactKey || !artifact.accountKey) throw new Error('Source artifact identity and account key are required.');
  if (artifact.financialAccountId !== account.id) throw new Error('Source artifact must bind the selected FinancialAccount.');
  if (artifact.sourceKind !== 'BANK' || account.sourceKind !== 'BANK') throw new Error('Chase PDF importer accepts bank accounts only.');
  if (artifact.mimeType !== 'application/pdf') throw new Error('Source artifact must retain an application/pdf File.');
  if (artifact.originalFiles.length !== 1 || !artifact.originalFiles[0]?.fileId) throw new Error('Source artifact must retain exactly one immutable Twenty File.');
  if (artifact.byteLength !== bytes.byteLength || artifact.contentHash !== hash(bytes)) throw new Error('Local PDF bytes do not match the retained SourceArtifact hash.');
  if (!(artifact.period in REVIEWED_CHASE_STATEMENT_WINDOWS)) throw new Error('This bounded Chase operator accepts only reviewed source periods.');
};

/**
 * Creates a write-ready native projection from one locally held PDF. It never
 * writes, invokes a provider, or interprets an unbound file selector as
 * authority. Callers must present this exact plan for review before an
 * authorized generated-API writer persists it.
 */
export const planChasePdfImport = (input: ChasePdfImportInput) => {
  const { artifact, financialAccount, pdfBytes, extractedText } = input;
  requireCustody(artifact, financialAccount, pdfBytes);
  if (!extractedText.trim()) throw new Error('Poppler-derived PDF text is required.');
  const normalizedText = normalizeChasePdfTextPageBoundaries(extractedText);
  const controls = parseChaseCheckingPdfControlsText(normalizedText);
  const reviewedWindow = REVIEWED_CHASE_STATEMENT_WINDOWS[artifact.period as keyof typeof REVIEWED_CHASE_STATEMENT_WINDOWS];
  if (!reviewedWindow || controls.periodStart !== reviewedWindow[0] || controls.periodEnd !== reviewedWindow[1]) throw new Error('PDF controls do not match the retained reviewed control window.');
  const rows = parseChaseCheckingPdfRowsText(normalizedText, { periodStart: controls.periodStart, periodEnd: controls.periodEnd });
  reconcileChaseCheckingPdfRows(controls, rows);
  const statement: ParsedStatement = {
    receipt: {
      artifactId: artifact.artifactKey,
      accountKey: artifact.accountKey,
      sourceKind: 'BANK',
      originalFileName: artifact.originalFileName,
      mimeType: artifact.mimeType,
      byteLength: artifact.byteLength,
      sha256: artifact.contentHash,
      acquiredAt: artifact.acquiredAt,
      acquiredBy: artifact.acquiredBy,
      sourceFormat: 'PDF',
      parserProfileId: CHASE_CHECKING_PDF_CONTROLS_PROFILE.id,
      parserProfileVersion: CHASE_CHECKING_PDF_CONTROLS_PROFILE.version,
      originalFileId: artifact.originalFiles[0].fileId,
    },
    controls: {
      periodStart: controls.periodStart,
      periodEnd: controls.periodEnd,
      openingBalanceMinor: controls.openingBalanceMinor,
      closingBalanceMinor: controls.closingBalanceMinor,
    },
    rows: rows.map((row, index): RawStatementRow => ({
      sourceRecordId: `chase-pdf:${row.sourceLine}:${index + 1}`,
      sourceLocation: `pdf:text-line:${row.sourceLine}`,
      rawValues: { category: row.category, extractedTextSha256: createHash('sha256').update(normalizedText).digest('hex') },
      transactionDate: row.date,
      description: row.description,
      sourceAmount: amount(row.amountMinor),
      amountMinor: row.amountMinor,
      direction: row.amountMinor < 0 ? 'OUTFLOW' : 'INFLOW',
    })),
    rejectedRows: [],
  };
  const priorState = input.priorState ?? { receipts: [], rows: [] };
  const result = importBoundedStatement(
    statement,
    priorState,
    input.maxRows ?? 250,
    priorState.activeCheckpoint,
  );
  if (result.status === 'REJECTED') throw new Error(`Chase PDF import plan rejected: ${result.rejectedRows.map((row) => row.message).join('; ')}`);
  const native = toFinanceNativeImportRecords(statement, result, result.state.rows);
  return {
    receiptKey: native.importReceipts[0]?.receiptKey,
    status: result.status,
    importedRows: result.importedRows,
    duplicateRows: result.duplicateRows,
    checkpoint: result.checkpoint,
    state: result.state,
    records: {
      ...native,
      financeFacts: native.financeFacts.map((fact) => ({ ...fact, financialAccountId: financialAccount.id })),
    },
  };
};
