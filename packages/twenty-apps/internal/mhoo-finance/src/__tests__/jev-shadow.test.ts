import {describe, expect, it} from 'vitest';
import {buildFinanceEvidenceShadowEnvelope, observeWithJev, type JevReceipt} from '../decisions/jev-shadow';

const receipt: JevReceipt = {
  receiptVersion: 'mhoo-jev-gateway-v1',
  requestId: 'finance-1',
  caller: 'twenty',
  schemaVersion: 'finance-evidence-route-v1',
  mode: 'shadow',
  inputHash: 'a'.repeat(64),
  decisions: {route: {type: 'choice', choice: 'investigate', confidence: 0.9}},
  confidence: 0.9,
  latencyMs: 12,
  fallback: null,
  timestamp: '2026-09-21T00:00:00.000Z'
};

describe('Twenty Jev shadow adapter', () => {
  it('uses all three typed primitives with an explicit choice fallback', () => {
    const envelope = buildFinanceEvidenceShadowEnvelope({requestId: 'finance-1', summary: 'Synthetic statement missing a page.'});
    expect(Object.values(envelope.questions).map(question => question.type)).toEqual(['choice', 'score', 'noul']);
    expect('other' in envelope.questions.route.criteria).toBe(true);
  });

  it('compares the observation without applying it', async () => {
    const envelope = buildFinanceEvidenceShadowEnvelope({requestId: 'finance-1', summary: 'Synthetic statement missing a page.'});
    const result = await observeWithJev({
      envelope,
      baseline: 'investigate',
      decide: async () => receipt,
      compare: (baseline, value) => baseline === (value.decisions?.route as {choice?: string})?.choice
    });
    expect(result).toMatchObject({applied: false, baseline: 'investigate', agrees: true, status: 'observed'});
  });

  it('fails open to the existing baseline when Jev is unavailable', async () => {
    const envelope = buildFinanceEvidenceShadowEnvelope({requestId: 'finance-1', summary: 'Synthetic statement missing a page.'});
    const result = await observeWithJev({
      envelope,
      baseline: 'investigate',
      decide: async () => { throw new Error('offline'); },
      compare: () => false
    });
    expect(result).toEqual({applied: false, baseline: 'investigate', jev: null, agrees: null, status: 'unavailable'});
  });
});
