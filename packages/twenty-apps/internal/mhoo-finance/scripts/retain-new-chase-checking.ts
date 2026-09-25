import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';

import {
  CHASE_CHECKING_REVIEWED_MANIFEST_HASH,
  HASS_CHASE_CHECKING_ACCOUNT_ID,
  HASS_CHASE_CHECKING_ACCOUNT_KEY,
  REVIEWED_CHASE_CHECKING_PERIODS,
} from '../src/ingestion/chase-checking-batch-state';
import {
  CHASE_CHECKING_PDF_CONTROLS_PROFILE,
  normalizeChasePdfTextPageBoundaries,
  parseChaseCheckingPdfControlsText,
  parseChaseCheckingPdfRowsText,
  reconcileChaseCheckingPdfRows,
  type ChaseCheckingPdfControls,
} from '../src/ingestion/chase-pdf-controls';
import { SOURCE_ARTIFACT_FILES_FIELD_UNIVERSAL_IDENTIFIER } from '../src/constants/universal-identifiers';
import {
  CHASE_PDF_EXTRACTION_FILES_FIELD_UNIVERSAL_IDENTIFIER,
} from '../src/constants/chase-pdf-extraction-identifiers';

/**
 * Source-only operator for the 20 new Hass Chase checking PDFs.
 *
 * The local PDF directory is the operator's custody boundary. Every file must
 * match one reviewed hash, byte size, page count, statement window, row count,
 * and control reconciliation before a native File or handoff can be planned.
 * Local Drive export names are not authority; the reviewed original filename
 * is retained in the SourceArtifact metadata. `--apply` is deliberately
 * guarded by an explicit environment variable and is not run by this task.
 */

export const RETAINED_REMOTE_ALIAS = 'finance-install-20260914';
export const RETAINED_REMOTE_URL = 'https://hass-kitchen.mhoo.app';
export const LIVE_WRITE_ENVIRONMENT_VARIABLE = 'MHOO_ALLOW_LIVE_WRITE';
export const EXTRACTION_MIME_TYPE = 'text/plain';
export const EXTRACTION_HANDOFF_KEY_PREFIX = 'chase-pdf-extraction:';

export type ChaseCheckingSourceManifestEntry = Readonly<{
  period: string;
  periodStart: string;
  periodEnd: string;
  contentHash: string;
  expectedRows: number;
  originalFileName: string;
  byteLength: number;
  pageCount: number;
}>;

/**
 * Drive filename/size/page metadata is kept here, while hash, period, and
 * expected row count remain sourced from the reviewed immutable manifest. The
 * filenames are source locators only; they never grant Workspace authority.
 */
const SOURCE_FILE_METADATA = [
  ['2026-08', '83734192-DF53-4E8B-A9BC-CE3E10D48116-list.pdf', 251956, 8],
  ['2026-07', '31637E63-5052-4769-8876-DF83542DC718-list.pdf', 218825, 6],
  ['2026-06', '28411AEC-F1EF-4200-A01A-E023DCFEFB0C-list.pdf', 225085, 6],
  ['2026-05', '1961C104-DD6D-4009-BE6D-6EAED86A8754-list.pdf', 211734, 6],
  ['2026-04', '3E01A3B8-3D30-49DC-B2F5-3176B4CD0079-list.pdf', 207045, 6],
  ['2026-03', '37EC6C54-C005-4633-BDAC-1141DBA379FF-list.pdf', 229325, 6],
  ['2026-02', '976777DC-795E-4FFE-BF7E-CB029D2013F2-list.pdf', 219568, 6],
  ['2026-01', '463E293E-84C0-49FC-A35B-BA8B4B8BCE7C-list.pdf', 212024, 6],
  ['2025-12', '2F7D8E56-E392-43CF-9FF2-58124902CFF8-list.pdf', 199051, 6],
  ['2025-11', '34D20D68-4848-4049-8729-A0178098A5C1-list.pdf', 220868, 6],
  ['2025-10', 'EBA2B55F-C14B-412F-A6F7-072D6687D9F8-list.pdf', 226077, 6],
  ['2025-09', '36BF8C5B-DE42-496A-8586-68C06116C8ED-list.pdf', 222075, 8],
  ['2025-08', 'CCDB5414-4F35-4260-BFC6-98383E9634E3-list.pdf', 215217, 6],
  ['2025-07', '9FE94AE4-45E9-4EEC-A48D-B306C95E0895-list.pdf', 197513, 6],
  ['2025-06', 'F200B95F-D05E-4128-910C-26FF1CE42C53-list.pdf', 192315, 6],
  ['2025-05', 'FCF07E4D-7BC2-4DD0-B610-581CD576C191-list.pdf', 205882, 6],
  ['2025-04', 'F1E0BAC2-2887-42E1-A7B2-FE77ACC33364-list.pdf', 207216, 6],
  ['2025-03', '5B628FFB-6777-4D5D-BC03-C8D391A9937F-list.pdf', 210297, 6],
  ['2025-02', 'D218E1D6-10BB-483C-9F73-F4FBB7285646-list.pdf', 201401, 6],
  ['2025-01', '141BA67A-FBC6-4402-A9E9-F333C350A1E3-list.pdf', 210555, 6],
] as const satisfies readonly [string, string, number, number][];

const sourceMetadataByPeriod = new Map(SOURCE_FILE_METADATA.map(([period, originalFileName, byteLength, pageCount]) => [period, { originalFileName, byteLength, pageCount }]));

export const NEW_HASS_CHASE_CHECKING_MANIFEST: readonly ChaseCheckingSourceManifestEntry[] = REVIEWED_CHASE_CHECKING_PERIODS.map((reviewed) => {
  const metadata = sourceMetadataByPeriod.get(reviewed.period);
  if (!metadata) throw new Error(`Source metadata is missing a reviewed period: ${reviewed.period}`);
  return { ...reviewed, ...metadata };
});

export type PdfExtractionPlan = Readonly<{
  manifest: ChaseCheckingSourceManifestEntry;
  filePath: string;
  pdfBytes: Uint8Array;
  extractedText: string;
  extractedTextBytes: Uint8Array;
  sourceArtifactId: string;
  artifactKey: string;
  handoffId: string;
  handoffKey: string;
  controls: ChaseCheckingPdfControls;
  sourcePdfHash: string;
  extractionHash: string;
  textByteLength: number;
  pageCount: number;
  acquiredAt: string;
  acquiredBy: string;
}>;

export type GraphqlTransport = (query: string, variables?: Record<string, unknown>) => Promise<Record<string, unknown>>;

export type NativeFileReference = Readonly<{
  fileId: string;
  label?: string | null;
  url?: string | null;
}>;

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const stableUuid = (key: string): string => {
  const hex = sha256(Buffer.from(`mhoo-finance-chase-retention:${key}`));
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const utf8 = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'utf8'));

const artifactKeyFor = (period: ChaseCheckingSourceManifestEntry): string =>
  `${HASS_CHASE_CHECKING_ACCOUNT_KEY}:${period.period}:${period.contentHash}`;

const handoffKeyFor = (period: ChaseCheckingSourceManifestEntry): string =>
  `${EXTRACTION_HANDOFF_KEY_PREFIX}${period.contentHash}`;

const assertManifest = (manifest: readonly ChaseCheckingSourceManifestEntry[]): void => {
  if (manifest.length !== 20) throw new Error('Reviewed new Chase manifest must contain exactly 20 periods.');
  const periods = new Set<string>();
  const hashes = new Set<string>();
  const names = new Set<string>();
  for (const entry of manifest) {
    if (periods.has(entry.period) || hashes.has(entry.contentHash) || names.has(entry.originalFileName)) throw new Error('Reviewed Chase manifest contains a duplicate identity.');
    periods.add(entry.period);
    hashes.add(entry.contentHash);
    names.add(entry.originalFileName);
    if (!/^[0-9a-f]{64}$/.test(entry.contentHash) || !Number.isSafeInteger(entry.byteLength) || entry.byteLength < 1 || ![6, 8].includes(entry.pageCount) || !Number.isSafeInteger(entry.expectedRows) || entry.expectedRows < 1) throw new Error('Reviewed Chase manifest entry is invalid.');
  }
  const expected = REVIEWED_CHASE_CHECKING_PERIODS.map((entry) => entry.period).join(',');
  if ([...periods].join(',') !== expected) throw new Error('Reviewed Chase manifest order differs from the canonical batch manifest.');
  if (sha256(utf8(JSON.stringify(REVIEWED_CHASE_CHECKING_PERIODS))) !== CHASE_CHECKING_REVIEWED_MANIFEST_HASH) throw new Error('Canonical Chase manifest hash does not verify.');
};

assertManifest(NEW_HASS_CHASE_CHECKING_MANIFEST);

const assertPeriodControls = (controls: ChaseCheckingPdfControls, manifest: ChaseCheckingSourceManifestEntry): void => {
  if (controls.profileId !== CHASE_CHECKING_PDF_CONTROLS_PROFILE.id || controls.profileVersion !== CHASE_CHECKING_PDF_CONTROLS_PROFILE.version || controls.periodStart !== manifest.periodStart || controls.periodEnd !== manifest.periodEnd || controls.expectedPageCount !== manifest.pageCount || controls.reportedTransactionCount !== manifest.expectedRows) throw new Error('PDF controls differ from the exact reviewed manifest.');
};

const storedControlsFor = (plan: PdfExtractionPlan): Record<string, unknown> => ({
  schemaVersion: 'chase-checking-pdf-controls-v1',
  profileId: plan.controls.profileId,
  profileVersion: plan.controls.profileVersion,
  periodStart: plan.controls.periodStart,
  periodEnd: plan.controls.periodEnd,
  expectedPageCount: plan.controls.expectedPageCount,
  reportedTransactionCount: plan.controls.reportedTransactionCount,
  openingBalanceMinor: plan.controls.openingBalanceMinor,
  closingBalanceMinor: plan.controls.closingBalanceMinor,
  categories: plan.controls.categories,
});

export const buildPdfExtractionPlan = (input: Readonly<{
  manifest: ChaseCheckingSourceManifestEntry;
  filePath: string;
  pdfBytes: Uint8Array;
  extractedText: string;
  pageCount: number;
  acquiredAt: string;
  acquiredBy: string;
}>): PdfExtractionPlan => {
  const { manifest, filePath, pdfBytes, extractedText, pageCount, acquiredAt, acquiredBy } = input;
  const sourcePdfHash = sha256(pdfBytes);
  if (pdfBytes.byteLength !== manifest.byteLength || sourcePdfHash !== manifest.contentHash) throw new Error(`PDF bytes do not match the reviewed manifest for ${manifest.period}.`);
  if (!Number.isSafeInteger(pageCount) || pageCount !== manifest.pageCount) throw new Error(`PDF page count does not match the reviewed manifest for ${manifest.period}.`);
  if (!extractedText.trim()) throw new Error(`Poppler extraction is empty for ${manifest.period}.`);
  const normalizedText = normalizeChasePdfTextPageBoundaries(extractedText);
  const controls = parseChaseCheckingPdfControlsText(normalizedText);
  assertPeriodControls(controls, manifest);
  const rows = parseChaseCheckingPdfRowsText(normalizedText, { periodStart: controls.periodStart, periodEnd: controls.periodEnd });
  reconcileChaseCheckingPdfRows(controls, rows);
  if (rows.length !== manifest.expectedRows) throw new Error(`PDF row count does not match the reviewed manifest for ${manifest.period}.`);
  const extractedTextBytes = utf8(extractedText);
  const artifactKey = artifactKeyFor(manifest);
  const handoffKey = handoffKeyFor(manifest);
  return {
    manifest,
    filePath: resolve(filePath),
    pdfBytes,
    extractedText,
    extractedTextBytes,
    sourceArtifactId: stableUuid(`source-artifact:${artifactKey}`),
    artifactKey,
    handoffId: stableUuid(`extraction-handoff:${handoffKey}`),
    handoffKey,
    controls,
    sourcePdfHash,
    extractionHash: sha256(extractedTextBytes),
    textByteLength: extractedTextBytes.byteLength,
    pageCount,
    acquiredAt,
    acquiredBy,
  };
};

export const sourceArtifactPayload = (plan: PdfExtractionPlan, originalFileId: string): Record<string, unknown> => ({
  id: plan.sourceArtifactId,
  artifactKey: plan.artifactKey,
  accountKey: HASS_CHASE_CHECKING_ACCOUNT_KEY,
  financialAccountId: HASS_CHASE_CHECKING_ACCOUNT_ID,
  sourceKind: 'BANK',
  period: plan.manifest.period,
  status: 'PARTIAL',
  freshness: 'FRESH',
  originalFileName: plan.manifest.originalFileName,
  mimeType: 'application/pdf',
  byteLength: plan.pdfBytes.byteLength,
  contentHash: plan.sourcePdfHash,
  acquiredAt: plan.acquiredAt,
  acquiredBy: plan.acquiredBy,
  rowCount: plan.manifest.expectedRows,
  statementControls: JSON.stringify(storedControlsFor(plan)),
  originalFiles: [{ id: originalFileId }],
});

export const extractionHandoffPayload = (plan: PdfExtractionPlan, extractionFileId: string): Record<string, unknown> => ({
  id: plan.handoffId,
  handoffKey: plan.handoffKey,
  sourceArtifactId: plan.sourceArtifactId,
  sourcePdfHash: plan.sourcePdfHash,
  extractionHash: plan.extractionHash,
  parserProfile: plan.controls.profileId,
  parserVersion: plan.controls.profileVersion,
  extractionMimeType: EXTRACTION_MIME_TYPE,
  textByteLength: plan.textByteLength,
  pageCount: plan.pageCount,
  extractionFiles: [{ id: extractionFileId }],
});

export const safePlanSummary = (plans: readonly PdfExtractionPlan[], mode: string): Record<string, unknown> => ({
  mode,
  accountBinding: 'HASS_CHASE_CHECKING_BANK',
  manifestPeriods: plans.length,
  expectedRows: plans.reduce((sum, plan) => sum + plan.manifest.expectedRows, 0),
  sourcePdfBytes: plans.reduce((sum, plan) => sum + plan.pdfBytes.byteLength, 0),
  extractionBytes: plans.reduce((sum, plan) => sum + plan.textByteLength, 0),
  parserProfile: `${CHASE_CHECKING_PDF_CONTROLS_PROFILE.id}@${CHASE_CHECKING_PDF_CONTROLS_PROFILE.version}`,
  originalFilesPlanned: plans.length,
  extractionHandoffsPlanned: plans.length,
  write: false,
});

const requiredRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is missing.`);
  return value as Record<string, unknown>;
};

const requiredString = (record: Record<string, unknown>, key: string, label = key): string => {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is missing.`);
  return value;
};

const requiredInteger = (record: Record<string, unknown>, key: string, label = key): number => {
  const value = record[key];
  if (!Number.isSafeInteger(value)) throw new Error(`${label} is invalid.`);
  return value as number;
};

const gql = async (transport: GraphqlTransport, query: string, variables?: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const response = await transport(query, variables);
  if (!response || Object.keys(response).length === 0) throw new Error('Twenty GraphQL returned no data.');
  if ('errors' in response && Array.isArray(response.errors) && response.errors.length > 0) throw new Error('Twenty GraphQL rejected the operator request.');
  if ('data' in response) {
    const data = response.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Twenty GraphQL returned no data.');
    return data as Record<string, unknown>;
  }
  return response;
};

const readAccount = async (transport: GraphqlTransport): Promise<void> => {
  const data = await gql(transport, 'query ChaseCheckingAccount($filter: FinancialAccountFilterInput!) { financialAccounts(first: 2, filter: $filter) { edges { node { id sourceKind } } pageInfo { hasNextPage } } }', { filter: { id: { eq: HASS_CHASE_CHECKING_ACCOUNT_ID } } });
  const connection = requiredRecord(data.financialAccounts, 'FinancialAccount connection');
  const edges = connection.edges;
  const pageInfo = requiredRecord(connection.pageInfo, 'FinancialAccount page info');
  if (!Array.isArray(edges) || edges.length !== 1 || pageInfo.hasNextPage !== false) throw new Error('Workspace account binding is not unique.');
  const account = requiredRecord(requiredRecord(edges[0], 'FinancialAccount edge').node, 'FinancialAccount');
  if (requiredString(account, 'id') !== HASS_CHASE_CHECKING_ACCOUNT_ID || requiredString(account, 'sourceKind') !== 'BANK') throw new Error('Workspace account binding is not the reviewed Hass Chase BANK account.');
};

const readSourceArtifact = async (transport: GraphqlTransport, plan: PdfExtractionPlan): Promise<Record<string, unknown> | null> => {
  const data = await gql(transport, 'query ChaseSourceArtifact($filter: SourceArtifactFilterInput!) { sourceArtifacts(first: 2, filter: $filter) { edges { node { id artifactKey accountKey financialAccountId sourceKind period status mimeType originalFileName byteLength contentHash rowCount statementControls originalFiles { fileId label url } } } pageInfo { hasNextPage } } }', { filter: { contentHash: { eq: plan.sourcePdfHash } } });
  const connection = requiredRecord(data.sourceArtifacts, 'SourceArtifact connection');
  const edges = connection.edges;
  const pageInfo = requiredRecord(connection.pageInfo, 'SourceArtifact page info');
  if (!Array.isArray(edges) || edges.length > 1 || pageInfo.hasNextPage !== false) throw new Error(`Workspace SourceArtifact readback is not unique for ${plan.manifest.period}.`);
  if (edges.length === 0) return null;
  return requiredRecord(requiredRecord(edges[0], 'SourceArtifact edge').node, 'SourceArtifact');
};

const readExtraction = async (transport: GraphqlTransport, plan: PdfExtractionPlan): Promise<Record<string, unknown> | null> => {
  const data = await gql(transport, 'query ChasePdfExtraction($filter: ChasePdfExtractionFilterInput!) { chasePdfExtractions(first: 2, filter: $filter) { edges { node { id handoffKey sourceArtifact { id } sourcePdfHash extractionHash parserProfile parserVersion extractionMimeType textByteLength pageCount extractionFiles { fileId label url } } } pageInfo { hasNextPage } } }', { filter: { handoffKey: { eq: plan.handoffKey } } });
  const connection = requiredRecord(data.chasePdfExtractions, 'Chase PDF extraction connection');
  const edges = connection.edges;
  const pageInfo = requiredRecord(connection.pageInfo, 'Chase PDF extraction page info');
  if (!Array.isArray(edges) || edges.length > 1 || pageInfo.hasNextPage !== false) throw new Error(`Workspace extraction handoff readback is not unique for ${plan.manifest.period}.`);
  if (edges.length === 0) return null;
  return requiredRecord(requiredRecord(edges[0], 'Chase PDF extraction edge').node, 'Chase PDF extraction');
};

const fileBytes = async (file: NativeFileReference, expectedOrigin: string): Promise<Uint8Array> => {
  if (!file.url) throw new Error('Workspace File URL is missing for exact readback.');
  let signedUrl: URL;
  try {
    signedUrl = new URL(file.url);
  } catch {
    throw new Error('Workspace File URL is invalid.');
  }
  const origin = new URL(expectedOrigin).origin;
  if (signedUrl.origin !== origin || signedUrl.pathname !== `/file/files-field/${file.fileId}` || !signedUrl.searchParams.get('token')) throw new Error('Workspace File URL is not a signed URL for the queried File.');
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error('Workspace File readback failed.');
  return new Uint8Array(await response.arrayBuffer());
};

const nativeFiles = (record: Record<string, unknown>, key: string): NativeFileReference[] => {
  const value = record[key];
  if (!Array.isArray(value) || value.length !== 1) throw new Error(`Workspace ${key} binding is incomplete.`);
  return value.map((item) => {
    const file = requiredRecord(item, `${key} file`);
    return { fileId: requiredString(file, 'fileId'), label: typeof file.label === 'string' ? file.label : null, url: typeof file.url === 'string' ? file.url : null };
  });
};

const assertSourceArtifact = (plan: PdfExtractionPlan, artifact: Record<string, unknown>): void => {
  const accountId = typeof artifact.financialAccountId === 'string' ? artifact.financialAccountId : '';
  if (requiredString(artifact, 'id') !== plan.sourceArtifactId || requiredString(artifact, 'artifactKey') !== plan.artifactKey || requiredString(artifact, 'accountKey') !== HASS_CHASE_CHECKING_ACCOUNT_KEY || accountId !== HASS_CHASE_CHECKING_ACCOUNT_ID || requiredString(artifact, 'sourceKind') !== 'BANK' || requiredString(artifact, 'period') !== plan.manifest.period || requiredString(artifact, 'status') !== 'PARTIAL' || requiredString(artifact, 'mimeType') !== 'application/pdf' || requiredString(artifact, 'originalFileName') !== plan.manifest.originalFileName || requiredString(artifact, 'contentHash') !== plan.sourcePdfHash || requiredInteger(artifact, 'byteLength') !== plan.pdfBytes.byteLength || requiredInteger(artifact, 'rowCount') !== plan.manifest.expectedRows) throw new Error(`Workspace SourceArtifact readback differs for ${plan.manifest.period}.`);
  let actualControls: unknown;
  try {
    actualControls = JSON.parse(requiredString(artifact, 'statementControls'));
  } catch {
    throw new Error(`Workspace statement controls are invalid for ${plan.manifest.period}.`);
  }
  if (JSON.stringify(actualControls) !== JSON.stringify(storedControlsFor(plan))) throw new Error(`Workspace statement controls differ for ${plan.manifest.period}.`);
};

const assertExtraction = (plan: PdfExtractionPlan, handoff: Record<string, unknown>): void => {
  const sourceArtifact = requiredRecord(handoff.sourceArtifact, 'Extraction sourceArtifact');
  if (requiredString(handoff, 'id') !== plan.handoffId || requiredString(handoff, 'handoffKey') !== plan.handoffKey || requiredString(sourceArtifact, 'id') !== plan.sourceArtifactId || requiredString(handoff, 'sourcePdfHash') !== plan.sourcePdfHash || requiredString(handoff, 'extractionHash') !== plan.extractionHash || requiredString(handoff, 'parserProfile') !== plan.controls.profileId || requiredInteger(handoff, 'parserVersion') !== plan.controls.profileVersion || requiredString(handoff, 'extractionMimeType') !== EXTRACTION_MIME_TYPE || requiredInteger(handoff, 'textByteLength') !== plan.textByteLength || requiredInteger(handoff, 'pageCount') !== plan.pageCount) throw new Error(`Workspace extraction handoff differs for ${plan.manifest.period}.`);
};

const verifySourceArtifact = async (plan: PdfExtractionPlan, artifact: Record<string, unknown>, expectedOrigin: string): Promise<void> => {
  assertSourceArtifact(plan, artifact);
  const sourceFiles = nativeFiles(artifact, 'originalFiles');
  const originalBytes = await fileBytes(sourceFiles[0]!, expectedOrigin);
  if (originalBytes.byteLength !== plan.pdfBytes.byteLength || sha256(originalBytes) !== plan.sourcePdfHash) throw new Error(`Workspace original PDF File differs for ${plan.manifest.period}.`);
};

const verifyExtraction = async (plan: PdfExtractionPlan, handoff: Record<string, unknown>, expectedOrigin: string): Promise<void> => {
  assertExtraction(plan, handoff);
  const extractionFiles = nativeFiles(handoff, 'extractionFiles');
  const extractionBytes = await fileBytes(extractionFiles[0]!, expectedOrigin);
  if (extractionBytes.byteLength !== plan.textByteLength || sha256(extractionBytes) !== plan.extractionHash) throw new Error(`Workspace extraction File differs for ${plan.manifest.period}.`);
};

export const verifyWorkspacePlan = async (transport: GraphqlTransport, plans: readonly PdfExtractionPlan[], expectedOrigin = RETAINED_REMOTE_URL): Promise<void> => {
  await readAccount(transport);
  for (const plan of plans) {
    const artifact = await readSourceArtifact(transport, plan);
    if (!artifact) throw new Error(`Workspace SourceArtifact is missing for ${plan.manifest.period}.`);
    await verifySourceArtifact(plan, artifact, expectedOrigin);
    const handoff = await readExtraction(transport, plan);
    if (!handoff) throw new Error(`Workspace extraction handoff is missing for ${plan.manifest.period}.`);
    await verifyExtraction(plan, handoff, expectedOrigin);
  }
};

export const requireLiveWrite = (environment: NodeJS.ProcessEnv = process.env): void => {
  if (environment[LIVE_WRITE_ENVIRONMENT_VARIABLE] !== '1') throw new Error(`Live Workspace writes are disabled; set ${LIVE_WRITE_ENVIRONMENT_VARIABLE}=1 only after explicit approval.`);
};

const uploadFile = async (remote: { apiUrl: string; apiKey: string }, bytes: Uint8Array, fileName: string, fieldMetadataUniversalIdentifier: string): Promise<NativeFileReference> => {
  const form = new FormData();
  const blobBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobBuffer).set(bytes);
  form.append('operations', JSON.stringify({ query: 'mutation UploadChaseEvidence($file: Upload!, $fieldMetadataUniversalIdentifier: String!) { uploadFilesFieldFileByUniversalIdentifier(file: $file, fieldMetadataUniversalIdentifier: $fieldMetadataUniversalIdentifier) { id size } }', variables: { file: null, fieldMetadataUniversalIdentifier } }));
  form.append('map', JSON.stringify({ '0': ['variables.file'] }));
  form.append('0', new Blob([blobBuffer], { type: fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : EXTRACTION_MIME_TYPE }), fileName);
  const response = await fetch(`${remote.apiUrl}/metadata`, { method: 'POST', headers: { authorization: `Bearer ${remote.apiKey}` }, body: form });
  if (!response.ok) throw new Error('Twenty File upload was rejected.');
  const payload = await response.json() as { data?: { uploadFilesFieldFileByUniversalIdentifier?: { id: string; size: number } }; errors?: readonly unknown[] };
  const file = payload.data?.uploadFilesFieldFileByUniversalIdentifier;
  if (payload.errors?.length || !file || typeof file.id !== 'string' || file.size !== bytes.byteLength) throw new Error('Twenty File upload readback failed.');
  return { fileId: file.id, label: fileName };
};

const createRemoteTransport = async (): Promise<{ remote: { apiUrl: string; apiKey: string }; transport: GraphqlTransport }> => {
  const config = JSON.parse(await readFile(join(homedir(), '.twenty', 'config.json'), 'utf8')) as { remotes?: Record<string, { apiUrl?: string; apiKey?: string }> };
  const remote = config.remotes?.[RETAINED_REMOTE_ALIAS];
  if (remote?.apiUrl !== RETAINED_REMOTE_URL || !remote.apiKey) throw new Error('Expected authenticated Hass Kitchen remote is unavailable.');
  const transport: GraphqlTransport = async (query, variables) => {
    const response = await fetch(`${remote.apiUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${remote.apiKey}` }, body: JSON.stringify({ query, variables }) });
    if (!response.ok) throw new Error(`Twenty GraphQL HTTP ${response.status}.`);
    return await response.json() as Record<string, unknown>;
  };
  return { remote: { apiUrl: remote.apiUrl, apiKey: remote.apiKey }, transport };
};

export const writePlan = async (remote: { apiUrl: string; apiKey: string }, transport: GraphqlTransport, plans: readonly PdfExtractionPlan[]): Promise<void> => {
  await readAccount(transport);
  for (const plan of plans) {
    const existingArtifact = await readSourceArtifact(transport, plan);
    if (existingArtifact) {
      await verifySourceArtifact(plan, existingArtifact, remote.apiUrl);
    } else {
      const originalFile = await uploadFile(remote, plan.pdfBytes, plan.manifest.originalFileName, SOURCE_ARTIFACT_FILES_FIELD_UNIVERSAL_IDENTIFIER);
      await gql(transport, 'mutation CreateChaseSourceArtifact($data: [SourceArtifactCreateInput!]!, $upsert: Boolean!) { createSourceArtifacts(data: $data, upsert: $upsert) { id artifactKey contentHash } }', { data: [sourceArtifactPayload(plan, originalFile.fileId)], upsert: false });
    }
    const existingExtraction = await readExtraction(transport, plan);
    if (existingExtraction) {
      await verifyExtraction(plan, existingExtraction, remote.apiUrl);
    } else {
      const extractionFile = await uploadFile(remote, plan.extractedTextBytes, `${plan.manifest.originalFileName}.txt`, CHASE_PDF_EXTRACTION_FILES_FIELD_UNIVERSAL_IDENTIFIER);
      await gql(transport, 'mutation CreateChaseExtractionHandoff($data: [ChasePdfExtractionCreateInput!]!, $upsert: Boolean!) { createChasePdfExtractions(data: $data, upsert: $upsert) { id handoffKey sourcePdfHash extractionHash } }', { data: [extractionHandoffPayload(plan, extractionFile.fileId)], upsert: false });
    }
    await verifyWorkspacePlan(transport, [plan]);
  }
};

const readPageCount = (pdfPath: string): number => {
  const result = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.status !== 0 || !result.stdout) throw new Error('pdfinfo page metadata read failed.');
  const matches = [...result.stdout.matchAll(/^Pages:\s+(\d+)\s*$/gm)];
  if (matches.length !== 1) throw new Error('PDF page metadata is unavailable or ambiguous.');
  const pageCount = Number(matches[0][1]);
  if (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > 8) throw new Error('PDF page count is outside the bounded profile.');
  return pageCount;
};

const readPopplerText = (pdfPath: string): string => {
  const result = spawnSync('pdftotext', ['-raw', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0 || !result.stdout) throw new Error('Poppler pdftotext -raw extraction failed.');
  return result.stdout;
};

const loadPlans = async (pdfDirectory: string): Promise<PdfExtractionPlan[]> => {
  const entries = await readdir(pdfDirectory, { withFileTypes: true });
  const pdfPaths = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')).map((entry) => join(pdfDirectory, entry.name));
  if (pdfPaths.length !== NEW_HASS_CHASE_CHECKING_MANIFEST.length) throw new Error('PDF directory must contain exactly the 20 reviewed Chase originals.');
  const localFiles = await Promise.all(pdfPaths.map(async (path) => {
    const bytes = new Uint8Array(await readFile(path));
    return { path, bytes, contentHash: sha256(bytes) };
  }));
  const plans: PdfExtractionPlan[] = [];
  for (const manifest of NEW_HASS_CHASE_CHECKING_MANIFEST) {
    const matches = localFiles.filter((candidate) => candidate.bytes.byteLength === manifest.byteLength && candidate.contentHash === manifest.contentHash);
    if (matches.length !== 1) throw new Error(`Exact reviewed PDF bytes are missing or duplicated for ${manifest.period}.`);
    const match = matches[0]!;
    plans.push(buildPdfExtractionPlan({ manifest, filePath: match.path, pdfBytes: match.bytes, extractedText: readPopplerText(match.path), pageCount: readPageCount(match.path), acquiredAt: new Date().toISOString(), acquiredBy: 'authorized-local-operator' }));
  }
  return plans;
};

const parseCli = (): { mode: '--dry-run' | '--apply' | '--verify'; pdfDirectory: string } => {
  const args = process.argv.slice(2);
  const mode = args.find((value): value is '--dry-run' | '--apply' | '--verify' => value === '--dry-run' || value === '--apply' || value === '--verify');
  const pdfDirectory = args.find((value) => value !== mode);
  if (!mode || !pdfDirectory || args.length !== 2) throw new Error('Usage: retain-new-chase-checking.ts --dry-run|--apply|--verify <exact-pdf-directory>');
  return { mode, pdfDirectory: resolve(pdfDirectory) };
};

export const runOperator = async (mode: '--dry-run' | '--apply' | '--verify', pdfDirectory: string): Promise<Record<string, unknown>> => {
  const plans = await loadPlans(pdfDirectory);
  if (mode === '--dry-run') return safePlanSummary(plans, mode);
  if (mode === '--apply') requireLiveWrite();
  const { remote, transport } = await createRemoteTransport();
  if (mode === '--verify') {
    await verifyWorkspacePlan(transport, plans);
    return { ...safePlanSummary(plans, mode), status: 'EXACT_READBACK_VERIFIED', write: false };
  }
  await writePlan(remote, transport, plans);
  return { ...safePlanSummary(plans, mode), status: 'ORIGINALS_AND_EXTRACTIONS_READBACK_VERIFIED', write: true };
};

const main = async (): Promise<void> => {
  const { mode, pdfDirectory } = parseCli();
  const result = await runOperator(mode, pdfDirectory);
  // Safe summary only: never print paths, filenames, hashes, descriptions, or controls.
  process.stdout.write(`${JSON.stringify(result)}\n`);
};

if (process.argv[1]?.endsWith('retain-new-chase-checking.ts')) {
  void main().catch((error: unknown) => {
    process.stderr.write(`CHASE_CHECKING_RETENTION_FAILED ${error instanceof Error ? error.message : 'unknown'}\n`);
    process.exitCode = 1;
  });
}
