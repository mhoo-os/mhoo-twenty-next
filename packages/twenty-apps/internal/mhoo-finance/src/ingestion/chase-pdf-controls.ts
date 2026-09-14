import { parseMinorUnits } from './statement-importer';

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

  const pageMarkers = [...normalized.matchAll(/\bPage\s+(\d+)\s+of\s+(\d+)\b/g)];
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
