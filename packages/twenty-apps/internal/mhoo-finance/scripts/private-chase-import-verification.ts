type Transport = (request: {
  query: string;
  variables?: Record<string, unknown>;
}) => Promise<{
  data?: Record<string, any>;
  errors?: readonly { message: string }[];
}>;

type ExpectedFact = Readonly<{ factKey: string; sourceAmount: string }>;
type FactReadback = Readonly<{
  factKey: string;
  artifactId: string;
  financialAccountId: string;
  sourceAmount: string;
  exactAmountMinor: string;
  sourceCurrency: string;
}>;

const exactMinor = (value: string): string => {
  const match = /^(-?)(0|[1-9]\d*)\.(\d{2})$/.exec(value);
  if (!match) throw new Error('Reviewed source amount is not exact cents.');
  const cents = BigInt(match[2]) * 100n + BigInt(match[3]);
  return (match[1] ? -cents : cents).toString();
};

export const assertPopplerPageCount = (pdfInfo: string, extractedText: string): number => {
  const matches = [...pdfInfo.matchAll(/^Pages:\s+(\d+)\s*$/gm)];
  if (matches.length !== 1) throw new Error('PDF metadata page count is unavailable or ambiguous.');
  const pageCount = Number(matches[0][1]);
  if (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > 8) {
    throw new Error('PDF metadata page count is outside the bounded profile.');
  }
  const parts = extractedText.split('\f');
  const pages = parts.at(-1)?.trim() === '' ? parts.slice(0, -1) : parts;
  if (pages.length !== pageCount || pages.some((page) => page.trim().length === 0)) {
    throw new Error('Poppler extraction does not preserve every PDF page.');
  }
  return pageCount;
};

export const verifyReviewedChaseFacts = async (
  transport: Transport,
  input: Readonly<{
    artifactId: string;
    accountId: string;
    facts: readonly ExpectedFact[];
  }>,
): Promise<number> => {
  const expected = new Map<string, string>();
  for (const fact of input.facts) {
    if (!fact.factKey || expected.has(fact.factKey)) throw new Error('Reviewed plan has missing or duplicate fact keys.');
    expected.set(fact.factKey, exactMinor(fact.sourceAmount));
  }
  const actual: FactReadback[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;
  for (;;) {
    const response = await transport({
      query: 'query ReviewedFacts($filter: FinanceFactFilterInput!, $first: Int!, $after: String) { financeFacts(first: $first, after: $after, filter: $filter) { edges { node { factKey artifactId financialAccountId sourceAmount exactAmountMinor sourceCurrency } } pageInfo { hasNextPage endCursor } } }',
      variables: { filter: { artifactId: { eq: input.artifactId } }, first: 100, after },
    });
    const connection = response.data?.financeFacts;
    if (response.errors?.length || !Array.isArray(connection?.edges) || typeof connection.pageInfo?.hasNextPage !== 'boolean') {
      throw new Error('Exact Finance fact readback failed.');
    }
    actual.push(...connection.edges.map((edge: { node: FactReadback }) => edge.node));
    if (actual.length > 250) throw new Error('Finance fact readback exceeds the bounded planner limit.');
    if (!connection.pageInfo.hasNextPage) break;
    const cursor = connection.pageInfo.endCursor;
    if (typeof cursor !== 'string' || !cursor || seenCursors.has(cursor)) {
      throw new Error('Finance fact readback cursor is missing or repeated.');
    }
    seenCursors.add(cursor);
    after = cursor;
  }
  if (actual.length !== expected.size || actual.some((fact) =>
    !fact ||
    fact.artifactId !== input.artifactId ||
    fact.financialAccountId !== input.accountId ||
    fact.sourceCurrency !== 'USD' ||
    !expected.has(fact.factKey) ||
    fact.exactAmountMinor !== expected.get(fact.factKey) ||
    fact.sourceAmount !== input.facts.find((candidate) => candidate.factKey === fact.factKey)?.sourceAmount
  ) || new Set(actual.map((fact) => fact.factKey)).size !== actual.length) {
    throw new Error('Finance facts differ from the exact reviewed statement plan.');
  }
  return actual.length;
};
