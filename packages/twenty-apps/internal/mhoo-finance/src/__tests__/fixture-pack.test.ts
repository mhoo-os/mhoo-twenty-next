import { describe, expect, it } from 'vitest';

import { buildFixtureDataset } from 'src/fixtures/fixture-pack';

describe('Mhoo Finance fixture-first vertical slice', () => {
  it('contains the required synthetic source and edge-case coverage', () => {
    const dataset = buildFixtureDataset();

    expect(dataset.artifacts.some((artifact) => artifact.duplicateOf)).toBe(true);
    expect(dataset.rawRows.some((sourceRow) => sourceRow.classification === 'REFUND')).toBe(true);
    expect(dataset.rawRows.some((sourceRow) => sourceRow.classification === 'VOID')).toBe(true);
    expect(dataset.rawRows.some((sourceRow) => sourceRow.classification === 'DISCOUNT')).toBe(true);
    expect(dataset.rawRows.some((sourceRow) => sourceRow.classification === 'INTERNAL_TRANSFER')).toBe(true);
    expect(dataset.rawRows.some((sourceRow) => sourceRow.classification === 'CARD_PAYMENT')).toBe(true);
    expect(dataset.rawRows.some((sourceRow) => sourceRow.status === 'SUPERSEDED')).toBe(true);
    expect(dataset.coverage.some((item) => item.status === 'NO_DATA')).toBe(true);
    expect(dataset.coverage.some((item) => item.status === 'NO_ACTIVITY')).toBe(true);
    expect(dataset.coverage.some((item) => item.status === 'STALE')).toBe(true);
    expect(dataset.coverage.some((item) => item.status === 'PARTIAL')).toBe(true);
    expect(dataset.exceptions.some((exception) => exception.status === 'RESOLVED')).toBe(true);
    expect(dataset.exceptions.some((exception) => exception.status === 'OPEN')).toBe(true);
  });

  it('suppresses duplicate files, rows, and retries without changing authoritative facts', () => {
    const dataset = buildFixtureDataset();
    const rerun = buildFixtureDataset();

    expect(dataset.headline.duplicateSuppressedCount).toBeGreaterThan(0);
    expect(dataset.headline.factCount).toBe(rerun.headline.factCount);
    expect(dataset.headline.exposureCents).toBe(rerun.headline.exposureCents);
    expect(dataset.facts).toEqual(rerun.facts);
    expect(dataset.receipts.find((receipt) => receipt.status === 'DUPLICATE')).toMatchObject({
      attempts: 2,
      importedRows: 0,
    });
  });

  it('keeps source correction and pending-to-posted transitions revisioned', () => {
    const original = buildFixtureDataset('original');
    const corrected = buildFixtureDataset('corrected');
    const originalFebruary = original.periods.find((period) => period.period === '2026-02');
    const correctedFebruary = corrected.periods.find((period) => period.period === '2026-02');
    const correctedToast = corrected.facts.find((fact) => fact.sourceRowKey === 'toast-2026-02-002');
    const correctedCard = corrected.facts.find((fact) => fact.sourceRowKey === 'card-2026-02-001');

    expect(correctedFebruary?.operatingTotalCents).toBe(
      (originalFebruary?.operatingTotalCents ?? 0) - 1600,
    );
    expect(correctedToast).toMatchObject({ amountCents: 12100, revision: 2, revisionCount: 2 });
    expect(correctedCard).toMatchObject({ status: 'POSTED', revision: 2, revisionCount: 2 });
    expect(original.facts.find((fact) => fact.sourceRowKey === 'card-2026-02-001')).toMatchObject({
      status: 'PENDING',
      includedInTotals: false,
    });
  });

  it('excludes internal movements and POS overlap while retaining lineage', () => {
    const dataset = buildFixtureDataset();
    expect(dataset.facts.find((fact) => fact.sourceRowKey === 'bank-2026-01-002')).toMatchObject({
      includedInTotals: false,
      exclusionReason: 'INTERNAL_MOVEMENT',
    });
    expect(dataset.facts.find((fact) => fact.sourceRowKey === 'bank-2026-01-003')).toMatchObject({
      includedInTotals: false,
      exclusionReason: 'INTERNAL_MOVEMENT',
    });
    expect(dataset.facts.find((fact) => fact.sourceRowKey === 'clover-2026-02-001')).toMatchObject({
      includedInTotals: false,
      exclusionReason: 'POS_OVERLAP',
    });
    expect(dataset.trace.map((step) => step.kind)).toEqual([
      'DASHBOARD',
      'EXCEPTION',
      'FACT',
      'ARTIFACT_ROW',
    ]);
    expect(dataset.trace[3].reference).toContain('artifact-clover-2026-02');
  });

  it('explains an exception with evidence, limitations, and a bounded action', () => {
    const exception = buildFixtureDataset().exceptions.find(
      (candidate) => candidate.status === 'OPEN',
    );

    expect(exception).toBeDefined();
    expect(exception).toMatchObject({
      reason: expect.any(String),
      supportingEvidence: expect.any(String),
      limitingEvidence: expect.any(String),
      nextAction: expect.any(String),
    });
  });
});
