import assert from 'node:assert/strict';
import { createHash as createSha256 } from 'node:crypto';
import { describe, it, vi } from 'vitest';

import {
  CHASE_PDF_EXTRACTION_FILES_FIELD_UNIVERSAL_IDENTIFIER,
} from '../src/constants/chase-pdf-extraction-identifiers';
import { SOURCE_ARTIFACT_FILES_FIELD_UNIVERSAL_IDENTIFIER } from '../src/constants/universal-identifiers';
import {
  CHASE_CHECKING_PDF_CONTROLS_PROFILE,
} from '../src/ingestion/chase-pdf-controls';
import {
  NEW_HASS_CHASE_CHECKING_MANIFEST,
  LIVE_WRITE_ENVIRONMENT_VARIABLE,
  buildPdfExtractionPlan,
  extractionHandoffPayload,
  requireLiveWrite,
  safePlanSummary,
  sourceArtifactPayload,
  verifyWorkspacePlan,
  writePlan,
} from './retain-new-chase-checking';

const bytes = new TextEncoder().encode('synthetic exact PDF bytes');
const responseForBytes = (value: Uint8Array): Response => {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return new Response(buffer);
};
const text = [
  'Page 1 of 2',
  'October 01, 2024 through October 31, 2024',
  'CHECKING SUMMARY Chase Business Complete Checking',
  'INSTANCES AMOUNT',
  'Beginning Balance $100.00',
  'Deposits and Additions 1 25.00',
  'Checks Paid 1 -5.00',
  'Ending Balance 2 $120.00',
  'Page 2 of 2',
  'Deposits and Additions',
  '10/03/2024 CREDIT',
  'Entry $25.00',
  'Checks Paid',
  '1234 10/04/2024 -$5.00 RENT',
].join('\n');

const manifestEntry = {
  period: '2024-10',
  periodStart: '2024-10-01',
  periodEnd: '2024-10-31',
  contentHash: createHash(bytes),
  expectedRows: 2,
  originalFileName: 'synthetic-exact.pdf',
  byteLength: bytes.byteLength,
  pageCount: 2,
} as const;

function createHash(value: Uint8Array): string {
  return createSha256('sha256').update(value).digest('hex');
}

describe('new Hass Chase PDF retention operator', () => {
  it('pins the 20-period manifest to the canonical reviewed batch', () => {
    assert.equal(NEW_HASS_CHASE_CHECKING_MANIFEST.length, 20);
    assert.equal(NEW_HASS_CHASE_CHECKING_MANIFEST[0]?.period, '2025-01');
    assert.equal(NEW_HASS_CHASE_CHECKING_MANIFEST[NEW_HASS_CHASE_CHECKING_MANIFEST.length - 1]?.period, '2026-08');
    assert.equal(new Set(NEW_HASS_CHASE_CHECKING_MANIFEST.map((entry) => entry.contentHash)).size, 20);
    assert.equal(new Set(NEW_HASS_CHASE_CHECKING_MANIFEST.map((entry) => entry.originalFileName)).size, 20);
  });

  it('requires exact bytes, Poppler page count, controls, and row reconciliation', () => {
    const plan = buildPdfExtractionPlan({
      manifest: manifestEntry,
      filePath: '/tmp/opaque-drive-id.pdf',
      pdfBytes: bytes,
      extractedText: text,
      pageCount: 2,
      acquiredAt: '2026-09-15T00:00:00.000Z',
      acquiredBy: 'synthetic-test',
    });
    assert.equal(plan.controls.profileId, CHASE_CHECKING_PDF_CONTROLS_PROFILE.id);
    assert.equal(plan.controls.reportedTransactionCount, 2);
    assert.equal(plan.extractionHash.length, 64);
    assert.equal(plan.textByteLength, new TextEncoder().encode(text).byteLength);
    assert.throws(() => buildPdfExtractionPlan({ ...plan, manifest: { ...manifestEntry, byteLength: bytes.byteLength + 1 }, filePath: `/tmp/${manifestEntry.originalFileName}` }), /bytes do not match/);
    assert.throws(() => buildPdfExtractionPlan({ ...plan, pageCount: 4, manifest: manifestEntry, filePath: `/tmp/${manifestEntry.originalFileName}`, pdfBytes: bytes, extractedText: text, acquiredAt: '2026-09-15T00:00:00.000Z', acquiredBy: 'synthetic-test' }), /page count/);
  });

  it('builds account-bound SourceArtifact and chasePdfExtraction payloads', () => {
    const plan = buildPdfExtractionPlan({
      manifest: manifestEntry,
      filePath: `/tmp/${manifestEntry.originalFileName}`,
      pdfBytes: bytes,
      extractedText: text,
      pageCount: 2,
      acquiredAt: '2026-09-15T00:00:00.000Z',
      acquiredBy: 'synthetic-test',
    });
    const artifact = sourceArtifactPayload(plan, 'pdf-file');
    const handoff = extractionHandoffPayload(plan, 'text-file');
    assert.deepEqual(artifact, {
      ...artifact,
      accountKey: 'hass-chase-business-checking',
      financialAccountId: '703eba2a-132e-4599-babd-2c61260ce586',
      sourceKind: 'BANK',
      status: 'PARTIAL',
      originalFiles: [{ id: 'pdf-file' }],
    });
    assert.equal(handoff.sourceArtifactId, plan.sourceArtifactId);
    assert.equal(handoff.sourcePdfHash, plan.sourcePdfHash);
    assert.equal(handoff.extractionHash, plan.extractionHash);
    assert.equal(handoff.extractionMimeType, 'text/plain');
    assert.deepEqual(handoff.extractionFiles, [{ id: 'text-file' }]);
    assert.equal(SOURCE_ARTIFACT_FILES_FIELD_UNIVERSAL_IDENTIFIER.length, 36);
    assert.equal(CHASE_PDF_EXTRACTION_FILES_FIELD_UNIVERSAL_IDENTIFIER.length, 36);
  });

  it('emits only bounded aggregate dry-run output and keeps apply fail-closed', () => {
    const plan = buildPdfExtractionPlan({
      manifest: manifestEntry,
      filePath: `/tmp/${manifestEntry.originalFileName}`,
      pdfBytes: bytes,
      extractedText: text,
      pageCount: 2,
      acquiredAt: '2026-09-15T00:00:00.000Z',
      acquiredBy: 'synthetic-test',
    });
    const output = JSON.stringify(safePlanSummary([plan], '--dry-run'));
    assert.doesNotMatch(output, /synthetic exact PDF bytes|sourcePdfHash|extractedText|synthetic-test/);
    assert.throws(() => requireLiveWrite({}), new RegExp(LIVE_WRITE_ENVIRONMENT_VARIABLE));
    assert.doesNotThrow(() => requireLiveWrite({ [LIVE_WRITE_ENVIRONMENT_VARIABLE]: '1' }));
  });

  it('verifies exact native files and handoff fields without writing', async () => {
    const plan = buildPdfExtractionPlan({
      manifest: manifestEntry,
      filePath: `/tmp/${manifestEntry.originalFileName}`,
      pdfBytes: bytes,
      extractedText: text,
      pageCount: 2,
      acquiredAt: '2026-09-15T00:00:00.000Z',
      acquiredBy: 'synthetic-test',
    });
    const artifact = sourceArtifactPayload(plan, 'pdf-file');
    const handoff = extractionHandoffPayload(plan, 'text-file');
    const sourceArtifact = { ...artifact, originalFiles: [{ fileId: 'pdf-file', label: manifestEntry.originalFileName, url: 'https://hass-kitchen.mhoo.app/file/files-field/pdf-file?token=synthetic' }] };
    const extraction = { ...handoff, sourceArtifact: { id: plan.sourceArtifactId }, extractionFiles: [{ fileId: 'text-file', label: `${manifestEntry.originalFileName}.txt`, url: 'https://hass-kitchen.mhoo.app/file/files-field/text-file?token=synthetic' }] };
    const transport = vi.fn(async (query: string) => {
      if (query.includes('FinancialAccount')) return { data: { financialAccounts: { edges: [{ node: { id: '703eba2a-132e-4599-babd-2c61260ce586', sourceKind: 'BANK' } }], pageInfo: { hasNextPage: false } } } };
      if (query.includes('SourceArtifact')) return { data: { sourceArtifacts: { edges: [{ node: sourceArtifact }], pageInfo: { hasNextPage: false } } } };
      return { data: { chasePdfExtractions: { edges: [{ node: extraction }], pageInfo: { hasNextPage: false } } } };
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => new Response(new URL(String(input)).pathname.endsWith('/pdf-file') ? bytes : new TextEncoder().encode(text))) as typeof fetch;
    try {
      await verifyWorkspacePlan(transport, [plan]);
      assert.equal(transport.mock.calls.length, 3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('does not replace exact retained artifacts or files on retry', async () => {
    const plan = buildPdfExtractionPlan({
      manifest: manifestEntry,
      filePath: `/tmp/${manifestEntry.originalFileName}`,
      pdfBytes: bytes,
      extractedText: text,
      pageCount: 2,
      acquiredAt: '2026-09-15T00:00:00.000Z',
      acquiredBy: 'synthetic-test',
    });
    let artifact: Record<string, unknown> | null = null;
    let extraction: Record<string, unknown> | null = null;
    let uploadCount = 0;
    let sourceCreateCount = 0;
    let extractionCreateCount = 0;
    const transport = vi.fn(async (query: string, variables?: Record<string, unknown>) => {
      if (query.includes('FinancialAccount')) return { financialAccounts: { edges: [{ node: { id: '703eba2a-132e-4599-babd-2c61260ce586', sourceKind: 'BANK' } }], pageInfo: { hasNextPage: false } } };
      if (query.includes('CreateChaseSourceArtifact')) {
        sourceCreateCount += 1;
        const payload = (variables?.data as Record<string, unknown>[])[0]!;
        artifact = { ...payload, originalFiles: [{ fileId: 'uploaded-pdf', label: manifestEntry.originalFileName, url: 'https://hass-kitchen.mhoo.app/file/files-field/uploaded-pdf?token=synthetic' }] };
        return { createSourceArtifacts: { id: plan.sourceArtifactId, artifactKey: plan.artifactKey, contentHash: plan.sourcePdfHash } };
      }
      if (query.includes('CreateChaseExtractionHandoff')) {
        extractionCreateCount += 1;
        const payload = (variables?.data as Record<string, unknown>[])[0]!;
        extraction = { ...payload, sourceArtifact: { id: plan.sourceArtifactId }, extractionFiles: [{ fileId: 'uploaded-text', label: `${manifestEntry.originalFileName}.txt`, url: 'https://hass-kitchen.mhoo.app/file/files-field/uploaded-text?token=synthetic' }] };
        return { createChasePdfExtractions: { id: plan.handoffId, handoffKey: plan.handoffKey, sourcePdfHash: plan.sourcePdfHash, extractionHash: plan.extractionHash } };
      }
      if (query.includes('ChaseSourceArtifact')) return { sourceArtifacts: { edges: artifact ? [{ node: artifact }] : [], pageInfo: { hasNextPage: false } } };
      return { chasePdfExtractions: { edges: extraction ? [{ node: extraction }] : [], pageInfo: { hasNextPage: false } } };
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/metadata') {
        const fileId = uploadCount === 0 ? 'uploaded-pdf' : 'uploaded-text';
        uploadCount += 1;
        return new Response(JSON.stringify({ data: { uploadFilesFieldFileByUniversalIdentifier: { id: fileId, size: fileId === 'uploaded-pdf' ? bytes.byteLength : plan.textByteLength } } }), { status: 200 });
      }
      if (url.pathname.endsWith('/uploaded-pdf')) return responseForBytes(bytes);
      if (url.pathname.endsWith('/uploaded-text')) return responseForBytes(plan.extractedTextBytes);
      return new Response(null, { status: 404 });
    }) as typeof fetch;
    try {
      await writePlan({ apiUrl: 'https://hass-kitchen.mhoo.app', apiKey: 'synthetic-key' }, transport, [plan]);
      await writePlan({ apiUrl: 'https://hass-kitchen.mhoo.app', apiKey: 'synthetic-key' }, transport, [plan]);
      assert.equal(uploadCount, 2);
      assert.equal(sourceCreateCount, 1);
      assert.equal(extractionCreateCount, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
