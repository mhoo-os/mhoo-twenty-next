export type FinanceCoverageState =
  | 'PROVEN_COMPLETE'
  | 'SOURCE_COMPLETE_UNRECONCILED'
  | 'PARTIAL'
  | 'MISSING'
  | 'OUT_OF_SCOPE'
  | 'SUPERSEDED';

export type FinanceCompletenessReceipt = Readonly<{
  version: 'finance-completeness/v1';
  population: string;
  entityScope: string;
  accountScope: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  basis: string;
  acquisitionMethod: string;
  acquiredAt: string;
  authorityReceiptId: string;
  contentHash: string | null;
  sourceLocator: string | null;
  lifecycleState: string;
  expectedPopulation: string;
  observedPopulation: string;
  tests: readonly Readonly<{
    id: string;
    result: 'PASS' | 'FAIL';
    detail: string;
  }>[];
  gaps: readonly string[];
  exclusions: readonly string[];
  accessState: 'AUTHORIZED' | 'ACCESS_NOT_AUTHORIZED';
  coverageState: FinanceCoverageState;
  reviewerReference: string;
  reviewedAt: string;
}>;

const COVERAGE_STATES = new Set<FinanceCoverageState>([
  'PROVEN_COMPLETE',
  'SOURCE_COMPLETE_UNRECONCILED',
  'PARTIAL',
  'MISSING',
  'OUT_OF_SCOPE',
  'SUPERSEDED',
]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/i;
const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const validInstant = (value: unknown): value is string =>
  nonEmpty(value) && !Number.isNaN(Date.parse(value));
const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= 100 &&
  value.every((item) => nonEmpty(item));

/**
 * Validates the proof behind a named coverage claim. The legacy Coverage
 * status remains presentation metadata; only this receipt can support
 * PROVEN_COMPLETE.
 */
export const parseFinanceCompletenessReceipt = (
  value: string | null,
): FinanceCompletenessReceipt | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const row = parsed as Record<string, unknown>;
    const tests = row.tests;
    if (
      row.version !== 'finance-completeness/v1' ||
      !nonEmpty(row.population) ||
      !nonEmpty(row.entityScope) ||
      !nonEmpty(row.accountScope) ||
      typeof row.periodStart !== 'string' ||
      !ISO_DATE.test(row.periodStart) ||
      typeof row.periodEnd !== 'string' ||
      !ISO_DATE.test(row.periodEnd) ||
      row.periodStart > row.periodEnd ||
      !nonEmpty(row.timezone) ||
      !nonEmpty(row.basis) ||
      !nonEmpty(row.acquisitionMethod) ||
      !validInstant(row.acquiredAt) ||
      !nonEmpty(row.authorityReceiptId) ||
      (row.contentHash !== null &&
        (typeof row.contentHash !== 'string' ||
          !SHA256.test(row.contentHash))) ||
      (row.sourceLocator !== null && !nonEmpty(row.sourceLocator)) ||
      !nonEmpty(row.lifecycleState) ||
      !nonEmpty(row.expectedPopulation) ||
      !nonEmpty(row.observedPopulation) ||
      !Array.isArray(tests) ||
      !tests.length ||
      tests.length > 100 ||
      !tests.every((test) => {
        if (!test || typeof test !== 'object') return false;
        const candidate = test as Record<string, unknown>;
        return (
          nonEmpty(candidate.id) &&
          (candidate.result === 'PASS' || candidate.result === 'FAIL') &&
          nonEmpty(candidate.detail)
        );
      }) ||
      !stringArray(row.gaps) ||
      !stringArray(row.exclusions) ||
      (row.accessState !== 'AUTHORIZED' &&
        row.accessState !== 'ACCESS_NOT_AUTHORIZED') ||
      !COVERAGE_STATES.has(row.coverageState as FinanceCoverageState) ||
      !nonEmpty(row.reviewerReference) ||
      !validInstant(row.reviewedAt)
    ) {
      return null;
    }

    if (
      row.coverageState === 'PROVEN_COMPLETE' &&
      (row.accessState !== 'AUTHORIZED' ||
        row.contentHash === null ||
        row.sourceLocator === null ||
        row.gaps.length > 0 ||
        tests.some(
          (test) => (test as Record<string, unknown>).result !== 'PASS',
        ))
    ) {
      return null;
    }

    return Object.freeze({
      version: 'finance-completeness/v1',
      population: row.population,
      entityScope: row.entityScope,
      accountScope: row.accountScope,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      timezone: row.timezone,
      basis: row.basis,
      acquisitionMethod: row.acquisitionMethod,
      acquiredAt: row.acquiredAt,
      authorityReceiptId: row.authorityReceiptId,
      contentHash: row.contentHash,
      sourceLocator: row.sourceLocator,
      lifecycleState: row.lifecycleState,
      expectedPopulation: row.expectedPopulation,
      observedPopulation: row.observedPopulation,
      tests: Object.freeze(
        tests.map((test) => Object.freeze({ ...(test as object) })),
      ),
      gaps: Object.freeze([...row.gaps]),
      exclusions: Object.freeze([...row.exclusions]),
      accessState: row.accessState,
      coverageState: row.coverageState as FinanceCoverageState,
      reviewerReference: row.reviewerReference,
      reviewedAt: row.reviewedAt,
    }) as FinanceCompletenessReceipt;
  } catch {
    return null;
  }
};
