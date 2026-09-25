import { describe, expect, it, vi } from 'vitest';
import { assertChasePdfWriteAuthority, writeChasePdfPlan } from './chase-pdf-graphql-writer';
const artifact = { id: 'artifact', financialAccountId: 'account', mimeType: 'application/pdf', originalFiles: [{ fileId: 'file' }] };
const authority = { receiptId: 'approval-1', scope: 'MHO-227:MHO-228:FINANCE_PDF_IMPORT' as const, sourceArtifactId: 'artifact', financialAccountId: 'account' };
const schema = { data: { __schema: { queryType: { fields: [{ name: 'sourceArtifact' }, { name: 'financialAccount' }, { name: 'importReceipts' }] }, mutationType: { fields: [{ name: 'createImportReceipt' }, { name: 'createFinanceFacts' }] } } } };
const factsFor = (count: number) => Array.from({ length: count }, (_, i) => ({ factKey: `fact-${i}`, sourceAmount: i % 2 ? '-1.23' : '1.23' }));
const exactMinor = (sourceAmount: string) => sourceAmount.startsWith('-') ? '-123' : '123';
const factNode = (fact: { factKey: string; sourceAmount: string }) => ({ factKey: fact.factKey, artifactId: 'artifact', financialAccountId: 'account', sourceAmount: fact.sourceAmount, exactAmountMinor: exactMinor(fact.sourceAmount), sourceCurrency: 'USD' });
const factsPage = (facts: readonly { factKey: string; sourceAmount: string }[], start: number, end: number, hasNextPage: boolean, endCursor: string | null) => ({ data: { financeFacts: { edges: facts.slice(start, end).map((fact) => ({ node: factNode(fact) })), pageInfo: { hasNextPage, endCursor } } } });
const planFor = (facts: readonly { factKey: string; sourceAmount: string }[]) => ({ receiptKey: 'receipt-1', artifact, account: { id: 'account' }, records: { importReceipts: [{ receiptKey: 'receipt-1', contentHash: 'hash', importedRows: facts.length, deduplicatedRows: 0 }], financeFacts: facts } });
const pagedTransport = (facts: readonly { factKey: string; sourceAmount: string }[], pages: readonly { start: number; end: number; hasNextPage: boolean; endCursor: string | null; incomplete?: boolean }[]) => {
  const pageIndex = new Map<string, number>();
  return vi.fn(async (request) => {
    if (request.query.includes('__schema')) return schema;
    if (request.query.includes('ImportReceipt($filter')) return { data: { importReceipts: { edges: [] } } };
    if (request.query.includes('ImportReadback')) return { data: { importReceipts: { edges: [{ node: { id: 'receipt-id', receiptKey: 'receipt-1', contentHash: 'hash', importedRows: facts.length, deduplicatedRows: 0, artifactId: 'artifact' } }] } } };
    if (request.query.includes('FactsPreflight') || request.query.includes('FactsAfterWrite') || request.query.includes('FactsReadback')) {
      const operationName = request.query.match(/query (Facts\w+)/)?.[1] ?? 'FactsReadback';
      const index = pageIndex.get(operationName) ?? 0;
      pageIndex.set(operationName, index + 1);
      const page = pages[index];
      if (page?.incomplete) return { data: { financeFacts: { edges: [] } } };
      return factsPage(facts, page.start, page.end, page.hasNextPage, page.endCursor);
    }
    return { data: { createFinanceFacts: [], createImportReceipt: { id: 'receipt-id' } } };
  });
};
describe('external Chase writer guard', () => {
  it('requires exact authority and verifies workspace schema before any mutation', async () => {
    const transport = vi.fn().mockResolvedValue(schema);
    await expect(assertChasePdfWriteAuthority(transport, authority, artifact, { id: 'account' })).resolves.toBe(true);
    expect(transport.mock.calls[0][0].query).toContain('__schema');
  });
  it('writes facts before one receipt, batches at sixty, and readbacks exactly', async () => {
    const calls: any[] = [];
    const facts = factsFor(61);
    const completeFacts = () => ({ data: { financeFacts: { edges: facts.map((fact) => ({ node: factNode(fact) })), pageInfo: { hasNextPage: false, endCursor: null } } } });
    const transport = vi.fn(async (request) => { calls.push(request); if (request.query.includes('__schema')) return schema; if (request.query.includes('ImportReceipt($filter')) return { data: { importReceipts: { edges: [] } } }; if (request.query.includes('ImportReadback')) return { data: { importReceipts: { edges: [{ node: { id: 'receipt-id', receiptKey: 'receipt-1', contentHash: 'hash', importedRows: 61, deduplicatedRows: 0, artifactId: 'artifact' } }] } } }; if (request.query.includes('FactsPreflight')) return { data: { financeFacts: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } } }; if (request.query.includes('FactsAfterWrite') || request.query.includes('FactsReadback')) return completeFacts(); return { data: { createFinanceFacts: [], createImportReceipt: { id: 'receipt-id' } } }; });
    await expect(writeChasePdfPlan(transport, authority, async () => true, { receiptKey: 'receipt-1', artifact, account: { id: 'account' }, records: { importReceipts: [{ receiptKey: 'receipt-1', contentHash: 'hash', importedRows: 61, deduplicatedRows: 0 }], financeFacts: facts } })).resolves.toEqual({ created: true, receiptId: 'receipt-id' });
    expect(calls.filter((call) => call.query.includes('CreateFacts'))).toHaveLength(2);
    expect(calls.findIndex((call) => call.query.includes('CreateReceipt'))).toBeGreaterThan(calls.findIndex((call) => call.query.includes('CreateFacts')));
    expect(calls.findIndex((call) => call.query.includes('FactsAfterWrite'))).toBeLessThan(calls.findIndex((call) => call.query.includes('CreateReceipt')));
  });
  it('heals a matching receipt that was left with an incomplete fact set', async () => {
    const facts = factsFor(3);
    let stored = facts.slice(0, 1);
    const transport = vi.fn(async (request) => {
      if (request.query.includes('__schema')) return schema;
      if (request.query.includes('ImportReceipt($filter')) return { data: { importReceipts: { edges: [{ node: { id: 'receipt-id', receiptKey: 'receipt-1', contentHash: 'hash', importedRows: facts.length, deduplicatedRows: 0, artifactId: 'artifact' } }] } } };
      if (request.query.includes('FactsPreflight')) return factsPage(stored, 0, stored.length, false, null);
      if (request.query.includes('CreateFacts')) { stored = facts; return { data: { createFinanceFacts: facts.map((fact) => ({ id: fact.factKey, factKey: fact.factKey })) } }; }
      if (request.query.includes('FactsAfterWrite') || request.query.includes('FactsReadback')) return factsPage(stored, 0, stored.length, false, null);
      if (request.query.includes('ImportReadback')) return { data: { importReceipts: { edges: [{ node: { id: 'receipt-id', receiptKey: 'receipt-1', contentHash: 'hash', importedRows: facts.length, deduplicatedRows: 0, artifactId: 'artifact' } }] } } };
      return { data: { createFinanceFacts: [], createImportReceipt: { id: 'receipt-id' } } };
    });
    await expect(writeChasePdfPlan(transport, authority, async () => true, planFor(facts))).resolves.toEqual({ created: false, receiptId: 'receipt-id' });
    expect(transport.mock.calls.filter(([request]) => request.query.includes('CreateFacts'))).toHaveLength(1);
  });
  it('replays a partial fact batch after an interrupted write', async () => {
    const facts = factsFor(61);
    let stored = facts.slice(0, 60);
    let failSecondBatch = true;
    const transport = vi.fn(async (request) => {
      if (request.query.includes('__schema')) return schema;
      if (request.query.includes('ImportReceipt($filter')) return { data: { importReceipts: { edges: [] } } };
      if (request.query.includes('FactsPreflight')) return factsPage(stored, 0, stored.length, false, null);
      if (request.query.includes('CreateFacts')) {
        if (failSecondBatch && request.variables?.data?.length === 1) { failSecondBatch = false; throw new Error('simulated interrupted fact batch'); }
        stored = facts;
        return { data: { createFinanceFacts: request.variables?.data ?? [] } };
      }
      if (request.query.includes('FactsAfterWrite') || request.query.includes('FactsReadback')) return factsPage(stored, 0, stored.length, false, null);
      if (request.query.includes('ImportReadback')) return { data: { importReceipts: { edges: [{ node: { id: 'receipt-id', receiptKey: 'receipt-1', contentHash: 'hash', importedRows: facts.length, deduplicatedRows: 0, artifactId: 'artifact' } }] } } };
      return { data: { createFinanceFacts: [], createImportReceipt: { id: 'receipt-id' } } };
    });
    await expect(writeChasePdfPlan(transport, authority, async () => true, planFor(facts))).rejects.toThrow('simulated interrupted fact batch');
    await expect(writeChasePdfPlan(transport, authority, async () => true, planFor(facts))).resolves.toEqual({ created: true, receiptId: 'receipt-id' });
    expect(transport.mock.calls.filter(([request]) => request.query.includes('CreateReceipt'))).toHaveLength(1);
  });
  it('fails closed when the post-write receipt projection differs', async () => {
    const transport = vi.fn(async (request) => {
      if (request.query.includes('__schema')) return schema;
      if (request.query.includes('ImportReceipt($filter')) return { data: { importReceipts: { edges: [] } } };
      if (request.query.includes('ImportReadback')) return { data: { importReceipts: { edges: [{ node: { id: 'receipt-id', receiptKey: 'receipt-1', contentHash: 'other', importedRows: 1, deduplicatedRows: 0, artifactId: 'artifact' } }] } } };
      if (request.query.includes('FactsPreflight') || request.query.includes('FactsAfterWrite') || request.query.includes('FactsReadback')) return { data: { financeFacts: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } } };
      return { data: { createFinanceFacts: [], createImportReceipt: { id: 'receipt-id' } } };
    });
    await expect(writeChasePdfPlan(transport, authority, async () => true, { receiptKey: 'receipt-1', artifact, account: { id: 'account' }, records: { importReceipts: [{ receiptKey: 'receipt-1', contentHash: 'hash', importedRows: 0, deduplicatedRows: 0 }], financeFacts: [] } })).rejects.toThrow('Import receipt readback failed.');
  });
  it.each([101, 126])('paginates and exactly verifies a %i-row reviewed statement', async (count) => {
    const facts = factsFor(count);
    const transport = pagedTransport(facts, [{ start: 0, end: 100, hasNextPage: true, endCursor: 'cursor-1' }, { start: 100, end: count, hasNextPage: false, endCursor: null }]);
    await expect(writeChasePdfPlan(transport, authority, async () => true, planFor(facts))).resolves.toEqual({ created: true, receiptId: 'receipt-id' });
    const reads = transport.mock.calls.filter(([request]) => request.query.includes('FactsReadback'));
    expect(reads).toHaveLength(2);
    expect(reads[0][0].variables.after).toBeUndefined();
    expect(reads[1][0].variables.after).toBe('cursor-1');
  });
  it('fails closed for an incomplete fact-readback page', async () => {
    const facts = factsFor(101);
    const transport = pagedTransport(facts, [{ start: 0, end: 0, hasNextPage: false, endCursor: null, incomplete: true }]);
    await expect(writeChasePdfPlan(transport, authority, async () => true, planFor(facts))).rejects.toThrow('pagination is incomplete');
  });
  it('fails closed when a continued fact-readback page has no cursor', async () => {
    const facts = factsFor(101);
    const transport = pagedTransport(facts, [{ start: 0, end: 100, hasNextPage: true, endCursor: null }]);
    await expect(writeChasePdfPlan(transport, authority, async () => true, planFor(facts))).rejects.toThrow('cursor is missing or repeated');
  });
  it('fails closed for a repeated fact-readback cursor', async () => {
    const facts = factsFor(101);
    const transport = pagedTransport(facts, [{ start: 0, end: 100, hasNextPage: true, endCursor: 'cursor-1' }, { start: 100, end: 101, hasNextPage: true, endCursor: 'cursor-1' }]);
    await expect(writeChasePdfPlan(transport, authority, async () => true, planFor(facts))).rejects.toThrow('cursor is missing or repeated');
  });
  it('rejects a plan beyond the planner limit before it contacts the Workspace', async () => {
    const transport = vi.fn();
    const facts = factsFor(251);
    await expect(writeChasePdfPlan(transport, authority, async () => true, planFor(facts))).rejects.toThrow('Bounded statement exceeds the 250-fact planner limit.');
    expect(transport).not.toHaveBeenCalled();
  });
  it('does not touch GraphQL when durable authority verification fails', async () => {
    const transport = vi.fn();
    await expect(writeChasePdfPlan(transport, authority, async () => false, { receiptKey: 'receipt-1', artifact, account: { id: 'account' }, records: { importReceipts: [{ receiptKey: 'receipt-1' }], financeFacts: [] } })).rejects.toThrow('Durable import authority');
    expect(transport).not.toHaveBeenCalled();
  });
  it('fails before GraphQL for mismatched authority and fails closed for missing mutations', async () => {
    const transport = vi.fn().mockResolvedValue(schema);
    await expect(assertChasePdfWriteAuthority(transport, { ...authority, financialAccountId: 'other' }, artifact, { id: 'account' })).rejects.toThrow('bind exactly');
    expect(transport).not.toHaveBeenCalled();
    await expect(assertChasePdfWriteAuthority(vi.fn().mockResolvedValue({ data: { __schema: { queryType: { fields: [] }, mutationType: { fields: [] } } } }), authority, artifact, { id: 'account' })).rejects.toThrow('lacks required query');
  });
});
