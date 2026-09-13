import { currency, minor, sumMoney, type Currency } from '../contracts/money';
import {
  hasExactSelectedRecipients,
  isFinanceFollowUpTransitionAllowed,
  type FinanceDraftEmail,
  type FinanceFollowUpPerson,
  type FinanceFollowUpState,
} from './finance-follow-up-contract';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const nonEmpty = (value: string) => value.trim().length > 0;
const exactDate = (value: string) => {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};
const exactInstant = (value: string) =>
  nonEmpty(value) && !Number.isNaN(Date.parse(value));

export type InvestigationScope = Readonly<{
  runId: string;
  entityScope: string;
  accountScope: readonly string[];
  periodStart: string;
  periodEnd: string;
  timezone: string;
  basis: string;
  intendedUse: string;
  prohibitedOutputs: readonly string[];
  createdAt: string;
}>;

export const defineInvestigationScope = (
  input: InvestigationScope,
): InvestigationScope => {
  if (
    !UUID.test(input.runId) ||
    !nonEmpty(input.entityScope) ||
    !input.accountScope.length ||
    input.accountScope.some((value) => !nonEmpty(value)) ||
    !exactDate(input.periodStart) ||
    !exactDate(input.periodEnd) ||
    input.periodStart > input.periodEnd ||
    !nonEmpty(input.timezone) ||
    !nonEmpty(input.basis) ||
    !nonEmpty(input.intendedUse) ||
    !input.prohibitedOutputs.length ||
    input.prohibitedOutputs.some((value) => !nonEmpty(value)) ||
    !exactInstant(input.createdAt)
  ) {
    throw new Error('Invalid InvestigationRun scope');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: input.timezone }).format();
  } catch {
    throw new Error('Invalid InvestigationRun timezone');
  }
  return Object.freeze({
    ...input,
    accountScope: Object.freeze([...new Set(input.accountScope)]),
    prohibitedOutputs: Object.freeze([...new Set(input.prohibitedOutputs)]),
  });
};

export type ExplanationEvent = Readonly<{
  sequence: number;
  type: 'EXPLANATION_RECORDED' | 'EXPLANATION_DISPOSED' | 'EVIDENCE_ADDED';
  explanationId: string;
  assertion?: string;
  disposition?: string;
  evidenceReferences?: readonly string[];
  contradicts?: boolean;
  occurredAt: string;
}>;

export type ExplanationState = Readonly<{
  explanationId: string;
  assertion: string;
  disposition: string | null;
  workflowState: 'INVESTIGATING' | 'DISPOSED' | 'REOPENED';
  evidenceReferences: readonly string[];
  history: readonly ExplanationEvent[];
}>;

export const reduceExplanationHistory = (
  events: readonly ExplanationEvent[],
): ExplanationState => {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  if (!ordered.length || ordered[0].type !== 'EXPLANATION_RECORDED') {
    throw new Error('Explanation history must start with a recorded assertion');
  }
  if (
    ordered.some(
      (event, index) =>
        event.sequence !== index + 1 ||
        event.explanationId !== ordered[0].explanationId ||
        !exactInstant(event.occurredAt),
    )
  ) {
    throw new Error('Invalid explanation event sequence');
  }
  const assertion = ordered[0].assertion?.trim();
  if (!assertion) throw new Error('Explanation assertion required');
  let disposition: string | null = null;
  let workflowState: ExplanationState['workflowState'] = 'INVESTIGATING';
  const evidence: string[] = [];
  for (const event of ordered.slice(1)) {
    if (event.type === 'EXPLANATION_RECORDED')
      throw new Error('Explanation cannot be silently replaced');
    if (event.type === 'EXPLANATION_DISPOSED') {
      if (!event.disposition?.trim()) throw new Error('Disposition required');
      disposition = event.disposition;
      workflowState = 'DISPOSED';
    }
    if (event.type === 'EVIDENCE_ADDED') {
      const references = event.evidenceReferences ?? [];
      if (!references.length || references.some((value) => !nonEmpty(value)))
        throw new Error('Evidence reference required');
      evidence.push(...references);
      if (disposition && event.contradicts === true) workflowState = 'REOPENED';
    }
  }
  return Object.freeze({
    explanationId: ordered[0].explanationId,
    assertion,
    disposition,
    workflowState,
    evidenceReferences: Object.freeze([...new Set(evidence)]),
    history: Object.freeze(ordered),
  });
};

export type MatchGroupType =
  | 'EXACT_ONE_TO_ONE'
  | 'SPLIT_ONE_TO_MANY'
  | 'BATCH_MANY_TO_ONE'
  | 'MANY_TO_MANY';
export type MatchGroupMember = Readonly<{
  factReference: string;
  side: 'SOURCE' | 'TARGET';
  amountMinor: string;
  currency: string;
  explicitReference: string | null;
}>;

export const evaluateMatchGroup = (
  type: MatchGroupType,
  members: readonly MatchGroupMember[],
) => {
  if (members.length < 2 || members.length > 100)
    throw new Error('Invalid MatchGroup size');
  const sources = members.filter((member) => member.side === 'SOURCE');
  const targets = members.filter((member) => member.side === 'TARGET');
  const cardinalityValid =
    (type === 'EXACT_ONE_TO_ONE' && sources.length === 1 && targets.length === 1) ||
    (type === 'SPLIT_ONE_TO_MANY' && sources.length === 1 && targets.length > 1) ||
    (type === 'BATCH_MANY_TO_ONE' && sources.length > 1 && targets.length === 1) ||
    (type === 'MANY_TO_MANY' && sources.length > 1 && targets.length > 1);
  if (!cardinalityValid) throw new Error('MatchGroup cardinality mismatch');
  if (new Set(members.map((member) => member.factReference)).size !== members.length)
    throw new Error('Duplicate MatchGroup member');
  const currencies = new Set(members.map((member) => currency(member.currency)));
  if (currencies.size !== 1) throw new Error('Mixed currency MatchGroup');
  const unit = [...currencies][0] as Currency;
  const total = (rows: readonly MatchGroupMember[]) =>
    sumMoney(
      rows.map((row) => ({ currency: unit, minor: minor(row.amountMinor).toString() })),
      unit,
    ).minor;
  const sourceMinor = total(sources);
  const targetMinor = total(targets);
  const residualMinor = minor(
    (minor(sourceMinor) - minor(targetMinor)).toString(),
  ).toString();
  const references = new Set(
    members.map((member) => member.explicitReference).filter(Boolean),
  );
  const exact = residualMinor === '0';
  return Object.freeze({
    type,
    currency: unit,
    sourceMinor,
    targetMinor,
    residualMinor,
    status: exact ? ('EXACT' as const) : ('REVIEW_REQUIRED' as const),
    autoLinkEligible:
      exact && references.size === 1 &&
      members.every((member) => member.explicitReference !== null),
    preservesOriginals: true as const,
  });
};

type OptionalAmount = string | null;
export const evaluateCloverFundingBridge = (input: Readonly<{
  currency: string;
  grossSalesMinor: OptionalAmount;
  tenderMinor: OptionalAmount;
  feeMinor: OptionalAmount;
  reserveMinor: OptionalAmount;
  payoutMinor: OptionalAmount;
  bankDepositMinor: OptionalAmount;
}>) => {
  const unit = currency(input.currency);
  const missing = Object.entries(input)
    .filter(([key, value]) => key !== 'currency' && value === null)
    .map(([key]) => key);
  if (missing.length)
    return Object.freeze({ status: 'PARTIAL' as const, gaps: Object.freeze(missing) });
  const amount = (value: OptionalAmount) => minor(value as string);
  const gross = amount(input.grossSalesMinor);
  const tender = amount(input.tenderMinor);
  const fees = amount(input.feeMinor);
  const reserves = amount(input.reserveMinor);
  const payout = amount(input.payoutMinor);
  const bank = amount(input.bankDepositMinor);
  const expectedPayout = minor((tender - fees - reserves).toString());
  const contradictions = [
    ...(gross === tender ? [] : ['GROSS_TENDER_MISMATCH']),
    ...(expectedPayout === payout ? [] : ['PAYOUT_COMPONENT_MISMATCH']),
    ...(payout === bank ? [] : ['PAYOUT_BANK_MISMATCH']),
  ];
  return Object.freeze({
    status: contradictions.length
      ? ('CONTRADICTED' as const)
      : ('RECONCILED' as const),
    currency: unit,
    expectedPayoutMinor: expectedPayout.toString(),
    residualMinor: minor((payout - bank).toString()).toString(),
    contradictions: Object.freeze(contradictions),
    gaps: Object.freeze([] as string[]),
  });
};

export type BankLifecycleEvent = Readonly<{
  sequence: number;
  sourceRecordId: string;
  state: 'PENDING' | 'POSTED' | 'REMOVED' | 'REPLACED' | 'SUPERSEDED';
  replacesSourceRecordId: string | null;
}>;

export const reduceBankLifecycle = (events: readonly BankLifecycleEvent[]) => {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  if (ordered.some((event, index) => event.sequence !== index + 1))
    throw new Error('Invalid provider lifecycle sequence');
  const current = new Map<string, boolean>();
  for (const event of ordered) {
    if (!nonEmpty(event.sourceRecordId)) throw new Error('Source record ID required');
    if (event.replacesSourceRecordId) current.set(event.replacesSourceRecordId, false);
    current.set(event.sourceRecordId, event.state === 'POSTED' || event.state === 'REPLACED');
    if (event.state === 'REMOVED' || event.state === 'SUPERSEDED')
      current.set(event.sourceRecordId, false);
  }
  return Object.freeze({
    countedSourceRecordIds: Object.freeze(
      [...current].filter(([, counted]) => counted).map(([id]) => id),
    ),
    history: Object.freeze(ordered),
    preservesAllSourceRecords: true as const,
  });
};

export type MonthCoverage = Readonly<{
  month: string;
  state: 'PROVEN_COMPLETE' | 'PARTIAL' | 'MISSING';
  receiptReference: string | null;
}>;

export const evaluatePeriodCompleteness = (
  expectedMonths: readonly string[],
  receipts: readonly MonthCoverage[],
) => {
  if (!expectedMonths.length || new Set(expectedMonths).size !== expectedMonths.length)
    throw new Error('Expected months must be unique');
  const byMonth = new Map(receipts.map((receipt) => [receipt.month, receipt]));
  const months = expectedMonths.map(
    (month): MonthCoverage =>
      byMonth.get(month) ?? { month, state: 'MISSING', receiptReference: null },
  );
  const gaps = months.filter((month) => month.state !== 'PROVEN_COMPLETE');
  return Object.freeze({
    status: gaps.length ? ('INCOMPLETE' as const) : ('PROVEN_COMPLETE' as const),
    months: Object.freeze(months),
    gaps: Object.freeze(gaps.map((month) => month.month)),
    missingIsZeroActivity: false as const,
  });
};

export type FinanceFollowUpEvent = Readonly<{
  sequence: number;
  type:
    | 'CREATED'
    | 'EVIDENCE_ATTACHED'
    | 'DRAFT_PREPARED'
    | 'DRAFT_APPROVED_NOT_SENT'
    | 'REPLY_CORRELATED'
    | 'STATE_CHANGED';
  taskId: string;
  at: string;
  state?: FinanceFollowUpState;
  to?: FinanceFollowUpState;
  evidenceReference?: string;
  replyReference?: string;
  correlationKey?: string;
  draft?: FinanceDraftEmail;
}>;

export const reduceFinanceFollowUpEvents = (
  events: readonly FinanceFollowUpEvent[],
  people: readonly FinanceFollowUpPerson[],
) => {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  if (!ordered.length || ordered[0].type !== 'CREATED' || !ordered[0].state)
    throw new Error('Follow-up must start with native Task creation');
  if (
    !UUID.test(ordered[0].taskId) ||
    ordered.some(
      (event, index) =>
        event.sequence !== index + 1 ||
        event.taskId !== ordered[0].taskId ||
        !exactInstant(event.at),
    )
  )
    throw new Error('Invalid follow-up event sequence');
  let state = ordered[0].state;
  let draft: FinanceDraftEmail | null = null;
  let approvedNotSent = false;
  const evidence: string[] = [];
  const replies: string[] = [];
  for (const event of ordered.slice(1)) {
    if (event.type === 'CREATED') throw new Error('Task cannot be recreated');
    if (event.type === 'STATE_CHANGED') {
      if (!event.to || !isFinanceFollowUpTransitionAllowed(state, event.to))
        throw new Error('Invalid Finance follow-up transition');
      state = event.to;
    }
    if (event.type === 'EVIDENCE_ATTACHED') {
      if (!event.evidenceReference?.trim()) throw new Error('Evidence required');
      evidence.push(event.evidenceReference);
    }
    if (event.type === 'DRAFT_PREPARED') {
      if (!event.draft || !hasExactSelectedRecipients(event.draft, people))
        throw new Error('Draft recipients are not explicitly selected People');
      draft = event.draft;
      approvedNotSent = false;
    }
    if (event.type === 'DRAFT_APPROVED_NOT_SENT') {
      if (!draft) throw new Error('No request draft to approve');
      approvedNotSent = true;
    }
    if (event.type === 'REPLY_CORRELATED') {
      if (
        !event.replyReference?.trim() ||
        !event.correlationKey?.trim()
      )
        throw new Error('Attributed reply and correlation key required');
      replies.push(event.replyReference);
    }
  }
  return Object.freeze({
    taskId: ordered[0].taskId,
    state,
    evidenceReferences: Object.freeze([...new Set(evidence)]),
    draft,
    approval: approvedNotSent ? ('APPROVED_NOT_SENT' as const) : draft ? ('DRAFT' as const) : null,
    replyReferences: Object.freeze([...new Set(replies)]),
    sendAuthorized: false as const,
    history: Object.freeze(ordered),
  });
};
