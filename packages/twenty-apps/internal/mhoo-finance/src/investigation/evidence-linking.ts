export type EvidenceSourceType = 'BANK' | 'POS' | 'STATEMENT' | 'EMAIL';
export type EvidenceDirection = 'in' | 'out' | 'unknown';

export type EvidenceLinkInput = Readonly<{
  id: string;
  sourceType: EvidenceSourceType;
  sourceReference: string;
  sourceRecordId?: string;
  settlementReference?: string;
  transferReference?: string;
  account: string;
  date: string;
  direction: EvidenceDirection;
  amountMinor: string;
}>;

const evaluatedEvidenceLink: unique symbol = Symbol('evaluatedEvidenceLink');

export type EvaluatedEvidenceLink = Readonly<{
  [evaluatedEvidenceLink]: true;
  kind: 'AUTO_LINK' | 'REVIEW_REQUIRED' | 'NO_LINK';
  reasonCode:
    | 'DUPLICATE_SOURCE_RECORD'
    | 'EXPLICIT_SETTLEMENT_REFERENCE'
    | 'EXPLICIT_TRANSFER_PAIR'
    | 'AMOUNT_DATE_CANDIDATE'
    | 'INSUFFICIENT_EXPLICIT_EVIDENCE';
  explanation: string;
  sourceReferences: readonly [string, string];
  preservesOriginals: true;
  preventsDuplicateFinancialEntry: boolean;
  incomeExpenseClassification: 'UNCHANGED';
}>;

const dateDistance = (left: string, right: string) =>
  Math.abs(Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) /
  86_400_000;

const seal = (
  value: Omit<EvaluatedEvidenceLink, typeof evaluatedEvidenceLink>,
): EvaluatedEvidenceLink =>
  Object.freeze({
    ...value,
    sourceReferences: Object.freeze([...value.sourceReferences]) as readonly [
      string,
      string,
    ],
    [evaluatedEvidenceLink]: true as const,
  });

/**
 * Relates two already-normalized synthetic records using explicit identifiers,
 * amounts, dates and directions. Descriptions are deliberately never read.
 */
export const evaluateEvidenceLink = (
  entry: EvidenceLinkInput,
  evidence: EvidenceLinkInput,
): EvaluatedEvidenceLink => {
  const common = {
    sourceReferences: [
      entry.sourceReference,
      evidence.sourceReference,
    ] as const,
    preservesOriginals: true as const,
    incomeExpenseClassification: 'UNCHANGED' as const,
  };

  if (
    entry.sourceType === evidence.sourceType &&
    entry.sourceRecordId &&
    entry.sourceRecordId === evidence.sourceRecordId
  ) {
    return seal({
      ...common,
      kind: 'AUTO_LINK',
      reasonCode: 'DUPLICATE_SOURCE_RECORD',
      explanation:
        'The source type and stable source record ID are identical. Keep one financial entry and retain both acquisition references.',
      preventsDuplicateFinancialEntry: true,
    });
  }

  const sameAmount = entry.amountMinor === evidence.amountMinor;
  const sameDirection =
    entry.direction !== 'unknown' && entry.direction === evidence.direction;

  if (
    sameAmount &&
    entry.settlementReference &&
    entry.settlementReference === evidence.settlementReference &&
    new Set([entry.sourceType, evidence.sourceType]).has('BANK') &&
    new Set([entry.sourceType, evidence.sourceType]).has('POS')
  ) {
    return seal({
      ...common,
      kind: 'AUTO_LINK',
      reasonCode: 'EXPLICIT_SETTLEMENT_REFERENCE',
      explanation:
        'Bank and POS records share an explicit settlement reference and amount. Link their evidence without counting a second cash entry.',
      preventsDuplicateFinancialEntry: true,
    });
  }

  if (
    sameAmount &&
    entry.transferReference &&
    entry.transferReference === evidence.transferReference &&
    entry.account !== evidence.account &&
    entry.direction !== 'unknown' &&
    evidence.direction !== 'unknown' &&
    entry.direction !== evidence.direction
  ) {
    return seal({
      ...common,
      kind: 'AUTO_LINK',
      reasonCode: 'EXPLICIT_TRANSFER_PAIR',
      explanation:
        'Opposite directions across two owned accounts share an explicit transfer reference and amount. Link the pair, but do not classify it as income or expense.',
      preventsDuplicateFinancialEntry: false,
    });
  }

  if (
    sameAmount &&
    sameDirection &&
    dateDistance(entry.date, evidence.date) <= 2
  ) {
    return seal({
      ...common,
      kind: 'REVIEW_REQUIRED',
      reasonCode: 'AMOUNT_DATE_CANDIDATE',
      explanation:
        evidence.sourceType === 'EMAIL'
          ? 'The email evidence has a compatible amount, date and direction, but email never creates or auto-links a financial entry.'
          : 'Amount, date and direction are compatible, but no stable shared identifier proves the relationship.',
      preventsDuplicateFinancialEntry: evidence.sourceType === 'EMAIL',
    });
  }

  return seal({
    ...common,
    kind: 'NO_LINK',
    reasonCode: 'INSUFFICIENT_EXPLICIT_EVIDENCE',
    explanation:
      'No explicit identifier rule matched. Direction remains unchanged and no relationship is inferred from description text.',
    preventsDuplicateFinancialEntry: evidence.sourceType === 'EMAIL',
  });
};

export type EvidenceLinkHistoryItem = Readonly<{
  at: string;
  action: 'AUTO_LINKED' | 'LINKED_AFTER_REVIEW' | 'UNLINKED' | 'RESTORED';
}>;

export type EvidenceLinkState = Readonly<{
  status: 'LINKED' | 'NEEDS_REVIEW' | 'UNLINKED' | 'NO_LINK';
  history: readonly EvidenceLinkHistoryItem[];
}>;

export type EvidenceLinkAction = Readonly<{
  type: 'LINK_AFTER_REVIEW' | 'UNLINK' | 'RESTORE';
  at: string;
}>;

export const initialEvidenceLinkState = (
  verdict: EvaluatedEvidenceLink,
  at = '2025-09-14T00:00:00.000Z',
): EvidenceLinkState =>
  Object.freeze({
    status:
      verdict.kind === 'AUTO_LINK'
        ? 'LINKED'
        : verdict.kind === 'REVIEW_REQUIRED'
          ? 'NEEDS_REVIEW'
          : 'NO_LINK',
    history: Object.freeze(
      verdict.kind === 'AUTO_LINK'
        ? [{ at, action: 'AUTO_LINKED' as const }]
        : [],
    ),
  });

export const reduceEvidenceLink = (
  state: EvidenceLinkState,
  action: EvidenceLinkAction,
): EvidenceLinkState => {
  const allowed =
    (action.type === 'LINK_AFTER_REVIEW' && state.status === 'NEEDS_REVIEW') ||
    (action.type === 'UNLINK' && state.status === 'LINKED') ||
    (action.type === 'RESTORE' && state.status === 'UNLINKED');
  if (!allowed) return state;

  const next =
    action.type === 'UNLINK'
      ? { status: 'UNLINKED' as const, action: 'UNLINKED' as const }
      : action.type === 'RESTORE'
        ? { status: 'LINKED' as const, action: 'RESTORED' as const }
        : {
            status: 'LINKED' as const,
            action: 'LINKED_AFTER_REVIEW' as const,
          };
  return Object.freeze({
    status: next.status,
    history: Object.freeze([
      ...state.history,
      { at: action.at, action: next.action },
    ]),
  });
};
