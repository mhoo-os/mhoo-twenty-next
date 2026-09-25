import assert from 'node:assert/strict';
import test from 'node:test';

import { assertPopplerPageCount, verifyReviewedChaseFacts } from './private-chase-import-verification';

test('PDF metadata and extracted page boundaries must agree', () => {
  assert.equal(assertPopplerPageCount('Pages:          2\n', 'first\fsecond\f'), 2);
  assert.throws(() => assertPopplerPageCount('Pages: 4\n', 'first\fsecond\f'), /every PDF page/);
  assert.throws(() => assertPopplerPageCount('Pages: 2\n', 'first\f\f'), /every PDF page/);
  assert.throws(() => assertPopplerPageCount('not a PDF', 'first\fsecond\f'), /unavailable/);
});

const expected = Array.from({ length: 126 }, (_, index) => ({
  factKey: `fact-${index}`,
  sourceAmount: index % 2 ? '-1.23' : '2.34',
}));
const node = (fact: (typeof expected)[number]) => ({
  factKey: fact.factKey,
  artifactId: 'artifact',
  financialAccountId: 'account',
  sourceAmount: fact.sourceAmount,
  exactAmountMinor: fact.sourceAmount === '-1.23' ? '-123' : '234',
  sourceCurrency: 'USD',
});

test('exact verification reads beyond 100 rows', async () => {
  const afters: unknown[] = [];
  const count = await verifyReviewedChaseFacts(async (request) => {
    afters.push(request.variables?.after);
    const offset = request.variables?.after === 'next' ? 100 : 0;
    return { data: { financeFacts: {
      edges: expected.slice(offset, offset + 100).map((fact) => ({ node: node(fact) })),
      pageInfo: { hasNextPage: offset === 0, endCursor: offset === 0 ? 'next' : null },
    } } };
  }, { artifactId: 'artifact', accountId: 'account', facts: expected });
  assert.equal(count, 126);
  assert.deepEqual(afters, [undefined, 'next']);
});

test('same-count wrong amount, identity, or cursor fails closed', async () => {
  for (const changed of [
    { ...node(expected[0]), exactAmountMinor: '999' },
    { ...node(expected[0]), factKey: 'other-key' },
    { ...node(expected[0]), financialAccountId: 'other-account' },
  ]) {
    await assert.rejects(verifyReviewedChaseFacts(async () => ({ data: { financeFacts: {
      edges: [{ node: changed }], pageInfo: { hasNextPage: false, endCursor: null },
    } } }), { artifactId: 'artifact', accountId: 'account', facts: [expected[0]] }), /differ/);
  }
  await assert.rejects(verifyReviewedChaseFacts(async () => ({ data: { financeFacts: {
    edges: [], pageInfo: { hasNextPage: true, endCursor: null },
  } } }), { artifactId: 'artifact', accountId: 'account', facts: [] }), /cursor/);
});
