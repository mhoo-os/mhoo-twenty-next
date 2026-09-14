import { createHash } from 'node:crypto';

import {
  type OriginalArtifactReceipt,
  type ParsedStatement,
  type PreservedPdfArtifact,
  parseMinorUnits,
} from './statement-importer';

/**
 * A narrow parser for text extracted from Chase Business Complete Checking PDFs.
 * This is derived control evidence only: the original PDF still needs immutable
 * Files custody, an account binding, and a separate transaction-row source.
 */
export const CHASE_CHECKING_PDF_CONTROLS_PROFILE = {
  id: 'chase-business-complete-checking-pdf-controls-v1',
  version: 1,
} as const;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const CATEGORY_DIRECTIONS = {
  'Deposits and Additions': 1,
  'Checks Paid': -1,
  'Electronic Withdrawals': -1,
  'Other Withdrawals': -1,
  Fees: -1,
} as const;

export type ChaseSummaryCategory = keyof typeof CATEGORY_DIRECTIONS;

export type ChaseCheckingPdfControls = {
  profileId: typeof CHASE_CHECKING_PDF_CONTROLS_PROFILE.id;
  profileVersion: typeof CHASE_CHECKING_PDF_CONTROLS_PROFILE.version;
  periodStart: string;
  periodEnd: string;
  expectedPageCount: number;
  observedPageNumbers: readonly number[];
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  reportedTransactionCount: number;
  categories: Readonly<Partial<Record<ChaseSummaryCategory, { count: number; amountMinor: number }>>>;
};

/**
 * An extraction worker must explicitly bind its derived text to the immutable
 * PDF bytes it read. This contract records that binding; it does not perform
 * PDF extraction or make the derived text an original source artifact.
 */
export type ChasePdfTextExtractionV1 = Readonly<{
  schemaVersion: 'chase-pdf-text-extraction-v1';
  sourceArtifactSha256: string;
  text: string;
}>;

export type ChaseCheckingPdfControlEvidenceV1 = Readonly<{
  schemaVersion: 'chase-checking-pdf-control-evidence-v1';
  pdfArtifact: Pick<OriginalArtifactReceipt, 'artifactId' | 'accountKey' | 'originalFileId' | 'sha256' | 'parserProfileId' | 'parserProfileVersion'>;
  extractedTextSha256: string;
  controls: ChaseCheckingPdfControls;
}>;

export type ChaseCheckingStatementRowLineageV1 = Readonly<{
  schemaVersion: 'chase-checking-statement-row-lineage-v1';
  controlEvidence: ChaseCheckingPdfControlEvidenceV1;
  transactionArtifact: Pick<OriginalArtifactReceipt, 'artifactId' | 'accountKey' | 'originalFileId' | 'sha256' | 'parserProfileId' | 'parserProfileVersion'>;
  rows: ReadonlyArray<Readonly<{ sourceRecordId: string; sourceLocation: string }>>;
}>;

const requireMinor = (value: string): number => {
  const amount = parseMinorUnits(value.replace(/^\$/, ''));
  if (amount === undefined) throw new Error('Statement summary contains an invalid or unsafe amount.');
  return amount;
};

const parseDate = (monthName: string, dayText: string, yearText: string): string => {
  const month = MONTHS.indexOf(monthName as typeof MONTHS[number]) + 1;
  const day = Number(dayText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!month || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new Error('Statement period contains an invalid date.');
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

/** Rejects incomplete pages, unknown summary categories, and mismatched controls. */
export const parseChaseCheckingPdfControlsText = (text: string): ChaseCheckingPdfControls => {
  const normalized = text.replace(/\r\n?/g, '\n');
  const headings = [...normalized.matchAll(/^CHECKING SUMMARY Chase Business Complete Checking[ \t]*$/gm)];
  if (headings.length !== 1) throw new Error('Expected exactly one Chase checking summary.');

  const period = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\s+through\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\b/.exec(normalized);
  if (!period) throw new Error('Statement period is missing.');
  const periodStart = parseDate(period[1], period[2], period[3]);
  const periodEnd = parseDate(period[4], period[5], period[6]);
  if (periodStart > periodEnd) throw new Error('Statement period is reversed.');

  // Text extractors can join adjacent page text on either side of the marker.
  // Reject a following digit, but do not require word boundaries around it.
  const pageMarkers = [...normalized.matchAll(/Page\s+(\d+)\s+of\s+(\d+)(?!\d)/g)];
  const expectedPageCount = Number(pageMarkers[0]?.[2]);
  const observedPageNumbers = pageMarkers.map((match) => Number(match[1]));
  if (!Number.isSafeInteger(expectedPageCount) || expectedPageCount < 1 ||
    pageMarkers.length !== expectedPageCount ||
    pageMarkers.some((match) => Number(match[2]) !== expectedPageCount) ||
    observedPageNumbers.some((page, index) => page !== index + 1)) {
    throw new Error('Statement page sequence is incomplete or inconsistent.');
  }

  const summary = normalized.slice(headings[0].index! + headings[0][0].length).trimStart();
  const lines = summary.split('\n').map((line) => line.trim());
  if (lines.shift() !== 'INSTANCES AMOUNT') throw new Error('Statement summary header changed.');
  const opening = /^Beginning Balance\s+(\$[\d,]+\.\d{2})$/.exec(lines.shift() ?? '');
  if (!opening) throw new Error('Statement opening balance is missing.');

  const categories: Partial<Record<ChaseSummaryCategory, { count: number; amountMinor: number }>> = {};
  let ending: RegExpExecArray | null = null;
  for (const line of lines) {
    ending = /^Ending Balance\s+(\d+)\s+(\$[\d,]+\.\d{2})$/.exec(line);
    if (ending) break;
    const item = /^(.+?)\s+(\d+)\s+(-?[\d,]+\.\d{2})$/.exec(line);
    const category = item?.[1] as ChaseSummaryCategory | undefined;
    if (!item || !category || !(category in CATEGORY_DIRECTIONS) || category in categories) {
      throw new Error('Statement summary has an unsupported or duplicate category.');
    }
    const count = Number(item[2]);
    const amountMinor = requireMinor(item[3]);
    if (!Number.isSafeInteger(count) || count < 0 ||
      Math.sign(amountMinor) !== CATEGORY_DIRECTIONS[category]) {
      throw new Error('Statement summary category has an invalid count or direction.');
    }
    categories[category] = { count, amountMinor };
  }
  if (!ending || !categories['Deposits and Additions']) throw new Error('Statement summary is incomplete.');

  const openingBalanceMinor = requireMinor(opening[1]);
  const closingBalanceMinor = requireMinor(ending[2]);
  const reportedTransactionCount = Number(ending[1]);
  const observedTransactionCount = Object.values(categories).reduce((sum, item) => sum + item.count, 0);
  const calculatedClosing = BigInt(openingBalanceMinor) + Object.values(categories).reduce((sum, item) => sum + BigInt(item.amountMinor), 0n);
  if (!Number.isSafeInteger(reportedTransactionCount) || reportedTransactionCount !== observedTransactionCount ||
    calculatedClosing !== BigInt(closingBalanceMinor)) {
    throw new Error('Statement summary count or balance does not reconcile.');
  }

  return {
    profileId: CHASE_CHECKING_PDF_CONTROLS_PROFILE.id,
    profileVersion: CHASE_CHECKING_PDF_CONTROLS_PROFILE.version,
    periodStart,
    periodEnd,
    expectedPageCount,
    observedPageNumbers,
    openingBalanceMinor,
    closingBalanceMinor,
    reportedTransactionCount,
    categories,
  };
};

export const compareAdjacentChaseCheckingControls = (
  previous: ChaseCheckingPdfControls,
  next: ChaseCheckingPdfControls,
): boolean => {
  const nextDay = new Date(`${previous.periodEnd}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString().slice(0, 10) === next.periodStart &&
    previous.closingBalanceMinor === next.openingBalanceMinor;
};

const receiptReference = (receipt: OriginalArtifactReceipt): ChaseCheckingPdfControlEvidenceV1['pdfArtifact'] => ({
  artifactId: receipt.artifactId,
  accountKey: receipt.accountKey,
  originalFileId: receipt.originalFileId,
  sha256: receipt.sha256,
  parserProfileId: receipt.parserProfileId,
  parserProfileVersion: receipt.parserProfileVersion,
});

/**
 * Binds complete PDF custody to the derived Chase summary controls. The PDF
 * remains the original source; the extracted text is only a hash-addressed
 * derivative that must name those exact original bytes.
 */
export const createChaseCheckingPdfControlEvidence = (
  pdf: PreservedPdfArtifact,
  extraction: ChasePdfTextExtractionV1,
): ChaseCheckingPdfControlEvidenceV1 => {
  if (pdf.receipt.sourceFormat !== 'PDF' || pdf.receipt.mimeType !== 'application/pdf') {
    throw new Error('Chase controls require a retained PDF artifact.');
  }
  if (pdf.pageCompleteness !== 'COMPLETE') {
    throw new Error('Chase controls require complete PDF page custody.');
  }
  if (extraction.schemaVersion !== 'chase-pdf-text-extraction-v1' || extraction.sourceArtifactSha256 !== pdf.receipt.sha256) {
    throw new Error('Extracted Chase text must bind to the retained PDF hash.');
  }
  if (!extraction.text) throw new Error('Extracted Chase text is required.');

  return {
    schemaVersion: 'chase-checking-pdf-control-evidence-v1',
    pdfArtifact: receiptReference(pdf.receipt),
    extractedTextSha256: createHash('sha256').update(extraction.text).digest('hex'),
    controls: parseChaseCheckingPdfControlsText(extraction.text),
  };
};

/**
 * Connects the PDF summary controls to a separately parsed transaction source.
 * It deliberately does not invent PDF transaction rows or authorize an import.
 */
export const createChaseCheckingStatementRowLineage = (
  controlEvidence: ChaseCheckingPdfControlEvidenceV1,
  transactionStatement: ParsedStatement,
): ChaseCheckingStatementRowLineageV1 => {
  const controls = controlEvidence.controls;
  const receipt = transactionStatement.receipt;
  if (receipt.accountKey !== controlEvidence.pdfArtifact.accountKey) {
    throw new Error('Transaction rows must use the PDF control account binding.');
  }
  if (transactionStatement.controls.periodStart !== controls.periodStart || transactionStatement.controls.periodEnd !== controls.periodEnd) {
    throw new Error('Transaction rows must match the PDF control period.');
  }
  if (transactionStatement.rejectedRows.length > 0 || transactionStatement.rows.length !== controls.reportedTransactionCount) {
    throw new Error('Transaction rows must be complete and reconcile to the PDF control count.');
  }
  const rows = transactionStatement.rows.map(({ sourceRecordId, sourceLocation }) => ({ sourceRecordId, sourceLocation }));
  if (rows.some(({ sourceRecordId, sourceLocation }) => !sourceRecordId || !sourceLocation)
    || new Set(rows.map(({ sourceRecordId }) => sourceRecordId)).size !== rows.length
    || new Set(rows.map(({ sourceLocation }) => sourceLocation)).size !== rows.length) {
    throw new Error('Each transaction row requires a unique source record and source location.');
  }

  return {
    schemaVersion: 'chase-checking-statement-row-lineage-v1',
    controlEvidence,
    transactionArtifact: receiptReference(receipt),
    rows,
  };
};
