import type { GraphqlTransport } from './chase-pdf-graphql-writer';
import { REVIEWED_CHASE_STATEMENT_WINDOWS } from './chase-pdf-import';

const query = async (transport: GraphqlTransport, q: string, variables: Record<string, unknown>) => {
  const result = await transport({ query: q, variables });
  if (result.errors?.length || !result.data) throw new Error('Workspace preflight query failed.');
  return result.data;
};

export const preflightChasePdfImport = async (transport: GraphqlTransport, input: { sourceArtifactId: string; financialAccountId: string; sha256: string }) => {
  const data = await query(transport, 'query ChasePdfPreflight($artifactFilter: SourceArtifactFilterInput!, $accountFilter: FinancialAccountFilterInput!) { sourceArtifact(filter: $artifactFilter) { id period mimeType contentHash financialAccountId originalFiles } financialAccount(filter: $accountFilter) { id sourceKind } }', { artifactFilter: { id: { eq: input.sourceArtifactId } }, accountFilter: { id: { eq: input.financialAccountId } } });
  const artifact = data.sourceArtifact;
  const account = data.financialAccount;
  const missing = [
    !artifact ? 'sourceArtifact' : '', !account ? 'financialAccount' : '',
    artifact?.mimeType !== 'application/pdf' ? 'pdfFile' : '',
    artifact?.contentHash !== input.sha256 ? 'contentHash' : '',
    !(artifact?.period in REVIEWED_CHASE_STATEMENT_WINDOWS) ? 'period' : '',
    artifact?.financialAccountId !== input.financialAccountId ? 'accountBinding' : '',
    !Array.isArray(artifact?.originalFiles) || artifact.originalFiles.length !== 1 || !artifact.originalFiles[0]?.fileId ? 'retainedFile' : '',
    account?.sourceKind !== 'BANK' ? 'bankAccount' : '',
  ].filter(Boolean);
  return { ready: missing.length === 0, missing, fileCount: artifact?.originalFiles?.length ?? 0 };
};
