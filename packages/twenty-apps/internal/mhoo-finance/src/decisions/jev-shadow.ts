export type JevQuestion =
  | {type: 'choice'; instructions: unknown; criteria: Record<string, unknown> & {other: unknown}}
  | {type: 'score'; instructions: unknown; criteria: unknown[]}
  | {type: 'noul'; instructions: unknown; criteria: {true: unknown; false: unknown}};

export type TwentyJevEnvelope = {
  caller: 'twenty';
  requestId: string;
  schemaVersion: string;
  purpose: string;
  mode: 'shadow';
  state: unknown;
  questions: Record<string, JevQuestion>;
};

export type JevReceipt = {
  receiptVersion: string;
  requestId: string;
  caller: 'twenty';
  schemaVersion: string;
  mode: 'shadow';
  inputHash: string;
  decisions: Record<string, unknown> | null;
  confidence: number;
  latencyMs: number;
  fallback: string | null;
  timestamp: string;
};

export type JevShadowComparison<T> = {
  applied: false;
  baseline: T;
  jev: JevReceipt | null;
  agrees: boolean | null;
  status: 'observed' | 'unavailable';
};

export async function observeWithJev<T>({
  envelope,
  baseline,
  decide,
  compare
}: {
  envelope: TwentyJevEnvelope;
  baseline: T;
  decide: (envelope: TwentyJevEnvelope) => Promise<JevReceipt>;
  compare: (baseline: T, receipt: JevReceipt) => boolean;
}): Promise<JevShadowComparison<T>> {
  if (envelope.caller !== 'twenty' || envelope.mode !== 'shadow') throw new Error('JEV_TWENTY_SHADOW_REQUIRED');
  try {
    const receipt = await decide(envelope);
    if (!receipt || receipt.caller !== 'twenty' || receipt.mode !== 'shadow' || receipt.requestId !== envelope.requestId) {
      throw new Error('JEV_RECEIPT_INVALID');
    }
    if (!receipt.decisions || receipt.fallback) {
      return {applied: false, baseline, jev: receipt, agrees: null, status: 'unavailable'};
    }
    return {applied: false, baseline, jev: receipt, agrees: compare(baseline, receipt), status: 'observed'};
  } catch {
    return {applied: false, baseline, jev: null, agrees: null, status: 'unavailable'};
  }
}

export function buildFinanceEvidenceShadowEnvelope({requestId, summary}: {requestId: string; summary: string}): TwentyJevEnvelope {
  return {
    caller: 'twenty',
    requestId,
    schemaVersion: 'finance-evidence-route-v1',
    purpose: 'Compare a typed Jev observation with the existing deterministic finance evidence route.',
    mode: 'shadow',
    state: {summary},
    questions: {
      route: {
        type: 'choice',
        instructions: {
          question: 'Which bounded evidence route best matches the supplied summary?',
          constraint: 'This is observation only. Choose other if no route fits.'
        },
        criteria: {
          investigate: 'Required evidence is missing, conflicting, or uncertain.',
          ready: 'Explicit prerequisites are present for the existing deterministic processor.',
          other: 'Neither route is supported by the supplied summary.'
        }
      },
      completeness: {
        type: 'score',
        instructions: 'Rate only the evidence completeness described in the supplied summary.',
        criteria: ['Required evidence missing', 'Partially supported', 'Explicitly complete']
      },
      eligible: {
        type: 'noul',
        instructions: 'Are all explicit prerequisites present for deterministic processing?',
        criteria: {
          true: 'Every named prerequisite is explicitly present.',
          false: 'At least one prerequisite is absent, conflicting, or uncertain.'
        }
      }
    }
  };
}
