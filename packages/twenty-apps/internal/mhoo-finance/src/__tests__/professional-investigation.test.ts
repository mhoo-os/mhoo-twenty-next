import { describe, expect, it } from 'vitest';

import {
  defineInvestigationScope,
  evaluateCloverFundingBridge,
  evaluateMatchGroup,
  evaluatePeriodCompleteness,
  reduceBankLifecycle,
  reduceExplanationHistory,
  reduceFinanceFollowUpEvents,
  type FinanceFollowUpEvent,
} from '../investigation/professional-investigation';

const RUN = 'b976fbe8-7d49-4d87-bdf2-5245192149e0';
const TASK = '20202020-0001-4e7c-8001-123456789def';

describe('professional investigation domain', () => {
  it('freezes an exact InvestigationRun envelope and rejects impossible scope', () => {
    const run = defineInvestigationScope({
      runId: RUN,
      entityScope: 'Hass Kitchen LLC',
      accountScope: ['operating', 'reserve', 'operating'],
      periodStart: '2024-01-01',
      periodEnd: '2026-08-31',
      timezone: 'America/New_York',
      basis: 'CASH',
      intendedUse: 'Management reconciliation support',
      prohibitedOutputs: ['AUDIT_OPINION', 'MISCONDUCT_CONCLUSION'],
      createdAt: '2026-09-14T03:00:00.000Z',
    });
    expect(run.accountScope).toEqual(['operating', 'reserve']);
    expect(Object.isFrozen(run)).toBe(true);
    expect(() =>
      defineInvestigationScope({ ...run, periodEnd: '2026-99-99' }),
    ).toThrow('Invalid InvestigationRun scope');
  });

  it('retains a disposition and explicitly reopens it when contradictory evidence arrives', () => {
    const explanationId = 'explanation-1';
    const state = reduceExplanationHistory([
      {
        sequence: 1,
        type: 'EXPLANATION_RECORDED',
        explanationId,
        assertion: 'This movement may be an owned-account transfer.',
        occurredAt: '2026-09-14T03:00:00.000Z',
      },
      {
        sequence: 2,
        type: 'EXPLANATION_DISPOSED',
        explanationId,
        disposition: 'Supported by paired bank rows.',
        occurredAt: '2026-09-14T03:01:00.000Z',
      },
      {
        sequence: 3,
        type: 'EVIDENCE_ADDED',
        explanationId,
        evidenceReferences: ['bank:replacement-7'],
        contradicts: true,
        occurredAt: '2026-09-14T03:02:00.000Z',
      },
    ]);
    expect(state).toMatchObject({
      workflowState: 'REOPENED',
      disposition: 'Supported by paired bank rows.',
    });
    expect(state.history).toHaveLength(3);
  });

  it.each([
    ['SPLIT_ONE_TO_MANY', ['1000'], ['400', '600']],
    ['BATCH_MANY_TO_ONE', ['400', '600'], ['1000']],
    ['MANY_TO_MANY', ['400', '600'], ['250', '750']],
  ] as const)('proves an exact %s MatchGroup', (type, sources, targets) => {
    const members = [
      ...sources.map((amountMinor, index) => ({
        factReference: `source-${index}`,
        side: 'SOURCE' as const,
        amountMinor,
        currency: 'USD',
        explicitReference: 'batch-7',
      })),
      ...targets.map((amountMinor, index) => ({
        factReference: `target-${index}`,
        side: 'TARGET' as const,
        amountMinor,
        currency: 'USD',
        explicitReference: 'batch-7',
      })),
    ];
    expect(evaluateMatchGroup(type, members)).toMatchObject({
      residualMinor: '0',
      status: 'EXACT',
      autoLinkEligible: true,
      preservesOriginals: true,
    });
  });

  it('keeps a one-cent MatchGroup residual in review', () => {
    expect(
      evaluateMatchGroup('SPLIT_ONE_TO_MANY', [
        { factReference: 'source', side: 'SOURCE', amountMinor: '1000', currency: 'USD', explicitReference: 'batch-7' },
        { factReference: 'target-1', side: 'TARGET', amountMinor: '400', currency: 'USD', explicitReference: 'batch-7' },
        { factReference: 'target-2', side: 'TARGET', amountMinor: '599', currency: 'USD', explicitReference: 'batch-7' },
      ]),
    ).toMatchObject({ residualMinor: '1', status: 'REVIEW_REQUIRED', autoLinkEligible: false });
  });

  it('bridges Clover gross, tender, fees, reserves, payout and bank exactly', () => {
    expect(
      evaluateCloverFundingBridge({
        currency: 'USD',
        grossSalesMinor: '100000',
        tenderMinor: '100000',
        feeMinor: '2500',
        reserveMinor: '5000',
        payoutMinor: '92500',
        bankDepositMinor: '92500',
      }),
    ).toMatchObject({
      status: 'RECONCILED',
      expectedPayoutMinor: '92500',
      residualMinor: '0',
    });
  });

  it('reports missing Clover components instead of inventing a balancing amount', () => {
    expect(
      evaluateCloverFundingBridge({
        currency: 'USD',
        grossSalesMinor: '100000',
        tenderMinor: '100000',
        feeMinor: null,
        reserveMinor: null,
        payoutMinor: '92500',
        bankDepositMinor: '92500',
      }),
    ).toEqual({ status: 'PARTIAL', gaps: ['feeMinor', 'reserveMinor'] });
  });

  it('retains pending and removed rows while counting only the supported replacement', () => {
    const state = reduceBankLifecycle([
      { sequence: 1, sourceRecordId: 'pending-1', state: 'PENDING', replacesSourceRecordId: null },
      { sequence: 2, sourceRecordId: 'posted-1', state: 'POSTED', replacesSourceRecordId: 'pending-1' },
      { sequence: 3, sourceRecordId: 'posted-1', state: 'REMOVED', replacesSourceRecordId: null },
      { sequence: 4, sourceRecordId: 'posted-2', state: 'REPLACED', replacesSourceRecordId: 'posted-1' },
    ]);
    expect(state.countedSourceRecordIds).toEqual(['posted-2']);
    expect(state.history).toHaveLength(4);
    expect(state.preservesAllSourceRecords).toBe(true);
  });

  it('makes every expected month and gap visible without treating missing as zero', () => {
    const result = evaluatePeriodCompleteness(
      ['2025-01', '2025-02', '2025-03'],
      [
        { month: '2025-01', state: 'PROVEN_COMPLETE', receiptReference: 'receipt-jan' },
        { month: '2025-03', state: 'PARTIAL', receiptReference: 'receipt-mar' },
      ],
    );
    expect(result).toMatchObject({
      status: 'INCOMPLETE',
      gaps: ['2025-02', '2025-03'],
      missingIsZeroActivity: false,
    });
    expect(result.months[1]).toEqual({ month: '2025-02', state: 'MISSING', receiptReference: null });
  });

  it('creates a native-Task follow-up history with evidence, approve-not-send and reply correlation', () => {
    const people = [
      { personId: '30303030-0001-4e7c-8001-123456789def', name: 'Owner', role: 'Owner', selectedRecipient: true },
    ];
    const draft = {
      mailboxLabel: 'Authorized Gmail',
      subject: 'Receipt request',
      body: 'Please share the exact receipt for the attached movement.',
      recipientPersonIds: [people[0].personId],
      attachmentReferences: ['fact-7'],
    };
    const base = (sequence: number, type: FinanceFollowUpEvent['type']) => ({
      sequence,
      type,
      taskId: TASK,
      at: `2026-09-14T03:0${sequence}:00.000Z`,
    });
    const result = reduceFinanceFollowUpEvents(
      [
        { ...base(1, 'CREATED'), state: 'TO_DO' },
        { ...base(2, 'EVIDENCE_ATTACHED'), evidenceReference: 'fact-7' },
        { ...base(3, 'DRAFT_PREPARED'), draft },
        { ...base(4, 'DRAFT_APPROVED_NOT_SENT') },
        { ...base(5, 'STATE_CHANGED'), to: 'WAITING_FOR_REPLY' },
        { ...base(6, 'REPLY_CORRELATED'), replyReference: 'message-9', correlationKey: 'finance:fact-7' },
      ],
      people,
    );
    expect(result).toMatchObject({
      taskId: TASK,
      state: 'WAITING_FOR_REPLY',
      approval: 'APPROVED_NOT_SENT',
      sendAuthorized: false,
      evidenceReferences: ['fact-7'],
      replyReferences: ['message-9'],
    });
  });
});
