import type { ChasePdfArtifact, ChaseFinancialAccount } from './chase-pdf-import';
import { createHash } from 'node:crypto';

export type GraphqlTransport = (request: { query: string; variables?: Record<string, unknown> }) => Promise<{ data?: Record<string, any>; errors?: readonly { message: string }[] }>;
export type ImportAuthority = Readonly<{ receiptId: string; scope: 'MHO-227:MHO-228:FINANCE_PDF_IMPORT'; sourceArtifactId: string; financialAccountId: string }>;
export type ImportAuthorityVerifier = (authority: ImportAuthority) => Promise<boolean>;

const gql = async (transport: GraphqlTransport, query: string, variables?: Record<string, unknown>) => {
  const response = await transport({ query, variables });
  if (response.errors?.length || !response.data) throw new Error(`Twenty GraphQL rejected operator request: ${response.errors?.[0]?.message ?? 'missing data'}`);
  return response.data;
};
const stableUuid = (key: string) => { const hex = createHash('sha256').update(key).digest('hex'); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`; };
const currencyFromSourceAmount = (value: unknown) => {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(String(value));
  if (!match) throw new Error('Finance fact sourceAmount must be an exact two-decimal value.');
  const minor = `${match[1]}${match[2]}${match[3]}`.replace(/^(-?)0+(?=\d)/, '$1');
  return { minor, amount: { amountMicros: (BigInt(minor) * 10000n).toString(), currencyCode: 'USD' } };
};

/**
 * External, role-bound writer guard. It deliberately starts with introspection
 * and exact record reads: installation-specific object schema is never assumed
 * from this source checkout. The caller can perform the generated mutations
 * only after those assertions and an out-of-band approval receipt match.
 */
export const assertChasePdfWriteAuthority = async (
  transport: GraphqlTransport,
  authority: ImportAuthority,
  artifact: Pick<ChasePdfArtifact, 'id' | 'financialAccountId' | 'mimeType' | 'originalFiles'>,
  account: Pick<ChaseFinancialAccount, 'id'>,
) => {
  if (!authority.receiptId || authority.scope !== 'MHO-227:MHO-228:FINANCE_PDF_IMPORT') throw new Error('Explicit Finance import authority receipt is required.');
  if (authority.sourceArtifactId !== artifact.id || authority.financialAccountId !== account.id || artifact.financialAccountId !== account.id) throw new Error('Authority, SourceArtifact, and FinancialAccount must bind exactly.');
  if (artifact.mimeType !== 'application/pdf' || artifact.originalFiles.length !== 1 || !artifact.originalFiles[0]?.fileId) throw new Error('SourceArtifact must retain exactly one PDF Twenty File.');
  const schema = await gql(transport, 'query FinanceImportSchema { __schema { queryType { fields { name } } mutationType { fields { name } } } }');
  const queryFields = new Set(schema.__schema?.queryType?.fields?.map((field: { name: string }) => field.name));
  const mutationFields = new Set(schema.__schema?.mutationType?.fields?.map((field: { name: string }) => field.name));
  for (const field of ['sourceArtifact', 'financialAccount', 'importReceipts']) if (!queryFields.has(field)) throw new Error(`Workspace schema lacks required query ${field}.`);
  for (const field of ['createImportReceipt', 'createFinanceFacts']) if (!mutationFields.has(field)) throw new Error(`Workspace schema lacks required mutation ${field}.`);
  return true;
};

// Actual mutation documents are generated only after the live schema check.
// This avoids committing installation-specific input type names/metadata IDs.
export const requireReviewedGeneratedMutationDocument = (document: string, authority: ImportAuthority) => {
  if (!authority.receiptId || !/^mutation\s+/.test(document)) throw new Error('A reviewed generated mutation document and authority receipt are required.');
  return document;
};

type WritePlan = { receiptKey: string | undefined; artifact: Pick<ChasePdfArtifact, 'id' | 'financialAccountId' | 'mimeType' | 'originalFiles'>; account: Pick<ChaseFinancialAccount, 'id'>; records: { importReceipts: readonly Record<string, unknown>[]; financeFacts: readonly Record<string, unknown>[] } };

const MAX_PLANNED_FACTS = 250;
const FACT_READBACK_PAGE_SIZE = 100;

type FactReadback = Readonly<{
  factKey: string;
  artifactId: string;
  financialAccountId: string;
  sourceAmount: string;
  exactAmountMinor: string;
  sourceCurrency: string;
}>;

const readFacts = async (transport: GraphqlTransport, artifactId: string, operationName: string): Promise<FactReadback[]> => {
  const actual: FactReadback[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;
  for (;;) {
    const factsReadback = await gql(transport, `query ${operationName}($filter: FinanceFactFilterInput!, $first: Int!, $after: String) { financeFacts(first: $first, after: $after, filter: $filter) { edges { node { factKey artifactId financialAccountId sourceAmount exactAmountMinor sourceCurrency } } pageInfo { hasNextPage endCursor } } }`, { filter: { artifactId: { eq: artifactId } }, first: FACT_READBACK_PAGE_SIZE, after });
    const connection = factsReadback.financeFacts;
    const edges = connection?.edges;
    if (!Array.isArray(edges) || typeof connection?.pageInfo?.hasNextPage !== 'boolean') throw new Error('Finance fact readback pagination is incomplete.');
    for (const edge of edges) {
      const node = edge?.node as Partial<FactReadback> | undefined;
      if (!node || typeof node.factKey !== 'string' || typeof node.artifactId !== 'string' || typeof node.financialAccountId !== 'string' || typeof node.sourceAmount !== 'string' || typeof node.exactAmountMinor !== 'string' || typeof node.sourceCurrency !== 'string') throw new Error('Finance fact readback record is incomplete.');
      actual.push(node as FactReadback);
    }
    if (actual.length > MAX_PLANNED_FACTS) throw new Error(`Finance fact readback exceeds the ${MAX_PLANNED_FACTS}-fact planner limit.`);
    if (!connection.pageInfo.hasNextPage) return actual;
    const cursor = connection.pageInfo.endCursor;
    if (typeof cursor !== 'string' || cursor.length === 0 || seenCursors.has(cursor)) throw new Error('Finance fact readback pagination cursor is missing or repeated.');
    seenCursors.add(cursor);
    after = cursor;
  }
};

const assertExactFacts = (actual: readonly FactReadback[], expected: readonly Record<string, unknown>[], artifactId: string, accountId: string): boolean => {
  const expectedByKey = new Map(expected.map((fact) => [String(fact.factKey), fact]));
  if (expectedByKey.size !== expected.length) throw new Error('Finance fact plan contains duplicate fact keys.');
  const actualKeys = new Set<string>();
  for (const fact of actual) {
    if (actualKeys.has(fact.factKey)) throw new Error('Finance fact readback contains duplicate fact keys.');
    actualKeys.add(fact.factKey);
    const expectedFact = expectedByKey.get(fact.factKey);
    const currency = expectedFact ? currencyFromSourceAmount(expectedFact.sourceAmount) : undefined;
    if (!expectedFact || fact.artifactId !== artifactId || fact.financialAccountId !== accountId || fact.sourceAmount !== expectedFact.sourceAmount || fact.exactAmountMinor !== currency?.minor || fact.sourceCurrency !== 'USD') throw new Error('Finance fact readback contains an unexpected or conflicting fact.');
  }
  return actual.length === expected.length;
};

/** Persist a reviewed plan in the only safe order: receipt lookup, facts,
 * exact facts, receipt, then exact receipt/fact readback. No caller data becomes authority. */
export const writeChasePdfPlan = async (transport: GraphqlTransport, authority: ImportAuthority, verifyAuthority: ImportAuthorityVerifier, plan: WritePlan) => {
  if (!plan.receiptKey || plan.records.importReceipts.length !== 1) throw new Error('A single deterministic import receipt is required.');
  const facts = plan.records.financeFacts.map(({ artifactKey: _artifactKey, amount: _amount, exactAmountMinor: _minor, sourceCurrency: _currency, ...fact }) => {
    const currency = currencyFromSourceAmount(fact.sourceAmount);
    return { ...fact, id: stableUuid(String(fact.factKey)), artifactId: plan.artifact.id, financialAccountId: plan.account.id, exactAmountMinor: currency.minor, sourceCurrency: 'USD', amount: currency.amount };
  });
  if (facts.length > MAX_PLANNED_FACTS) throw new Error(`Bounded statement exceeds the ${MAX_PLANNED_FACTS}-fact planner limit.`);
  const expectedKeys = new Set(facts.map((fact) => String((fact as Record<string, unknown>).factKey)));
  if (expectedKeys.size !== facts.length) throw new Error('Finance fact plan contains duplicate fact keys.');
  if (!(await verifyAuthority(authority))) throw new Error('Durable import authority verification failed.');
  await assertChasePdfWriteAuthority(transport, authority, plan.artifact, plan.account);
  const { artifactKey: _artifactKey, ...receiptProjection } = plan.records.importReceipts[0];
  const receiptData = { ...receiptProjection, id: stableUuid(plan.receiptKey), artifactId: plan.artifact.id } as Record<string, unknown>;
  if (typeof receiptData.contentHash !== 'string' || !Number.isInteger(receiptData.importedRows) || !Number.isInteger(receiptData.deduplicatedRows)) throw new Error('Receipt projection must contain an exact hash and row counts.');
  const existing = await gql(transport, 'query ImportReceipt($filter: ImportReceiptFilterInput!) { importReceipts(filter: $filter) { edges { node { id receiptKey contentHash importedRows deduplicatedRows artifactId } } } }', { filter: { receiptKey: { eq: plan.receiptKey } } });
  const matches = existing.importReceipts?.edges ?? [];
  if (matches.length > 1) throw new Error('Receipt key is not unique; refusing duplicate import.');
  const existingReceipt = matches[0]?.node as Record<string, unknown> | undefined;
  if (existingReceipt && (existingReceipt.contentHash !== receiptData.contentHash || existingReceipt.importedRows !== receiptData.importedRows || existingReceipt.deduplicatedRows !== receiptData.deduplicatedRows || existingReceipt.artifactId !== plan.artifact.id)) throw new Error('Existing receipt does not bind this exact artifact, hash, and row counts.');

  // Read the fact set before deciding whether this is a no-op. A matching
  // receipt is not proof that an earlier fact batch finished; missing facts
  // are safely healed by deterministic fact-key upserts on replay.
  let actualFacts = await readFacts(transport, plan.artifact.id, 'FactsPreflight');
  if (!assertExactFacts(actualFacts, facts, plan.artifact.id, plan.account.id)) {
    for (let offset = 0; offset < facts.length; offset += 60) {
      const data = facts.slice(offset, offset + 60);
      await gql(transport, 'mutation CreateFacts($data: [FinanceFactCreateInput!]!) { createFinanceFacts(data: $data, upsert: true) { id factKey } }', { data });
    }
    actualFacts = await readFacts(transport, plan.artifact.id, 'FactsAfterWrite');
    if (!assertExactFacts(actualFacts, facts, plan.artifact.id, plan.account.id)) throw new Error('Finance fact readback failed after deterministic replay.');
  }
  if (matches.length === 0) {
    // Receipt creation is deliberately last: a receipt cannot be left behind
    // while the corresponding deterministic fact set is still incomplete.
    await gql(transport, 'mutation CreateReceipt($data: ImportReceiptCreateInput!) { createImportReceipt(data: $data, upsert: true) { id receiptKey } }', { data: receiptData });
  }
  const readback = await gql(transport, 'query ImportReadback($receiptFilter: ImportReceiptFilterInput!) { importReceipts(filter: $receiptFilter) { edges { node { id receiptKey contentHash importedRows deduplicatedRows artifactId } } } }', { receiptFilter: { receiptKey: { eq: plan.receiptKey } } });
  const receiptEdges = readback.importReceipts?.edges ?? [];
  const receipt = receiptEdges.length === 1 ? receiptEdges[0]?.node : undefined;
  if (!receipt || receipt.receiptKey !== plan.receiptKey || receipt.contentHash !== receiptData.contentHash || receipt.importedRows !== receiptData.importedRows || receipt.deduplicatedRows !== receiptData.deduplicatedRows || receipt.artifactId !== plan.artifact.id) throw new Error('Import receipt readback failed.');
  const finalFacts = await readFacts(transport, plan.artifact.id, 'FactsReadback');
  if (!assertExactFacts(finalFacts, facts, plan.artifact.id, plan.account.id)) throw new Error('Finance fact readback failed.');
  return { created: matches.length === 0, receiptId: receipt.id };
};
