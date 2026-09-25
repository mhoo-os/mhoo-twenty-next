import { describe, expect, it, vi } from 'vitest';
import { preflightChasePdfImport } from './chase-pdf-preflight';
const input = { sourceArtifactId: 'artifact', financialAccountId: 'account', sha256: 'hash' };
describe('Chase PDF Workspace preflight', () => {
  it('accepts only exact retained PDF/account binding', async () => {
    const transport = vi.fn().mockResolvedValue({ data: { sourceArtifact: { id: 'artifact', period: '2024-10', mimeType: 'application/pdf', contentHash: 'hash', financialAccountId: 'account', originalFiles: [{ fileId: 'file' }] }, financialAccount: { id: 'account', sourceKind: 'BANK' } } });
    await expect(preflightChasePdfImport(transport, input)).resolves.toEqual({ ready: true, missing: [], fileCount: 1 });
    expect(transport.mock.calls[0][0].variables).toEqual({ artifactFilter: { id: { eq: 'artifact' } }, accountFilter: { id: { eq: 'account' } } });
  });
  it.each(['2024-11', '2024-12', '2021-08', '2021-09', '2021-10', '2021-11', '2021-12', '2022-01', '2022-02', '2022-03', '2022-04', '2022-05', '2022-06', '2022-07', '2022-08', '2022-09', '2022-10', '2022-11', '2022-12', '2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06', '2023-07', '2023-08', '2023-09', '2023-10', '2023-11', '2023-12'])('accepts another reviewed period %s', async (period) => {
    const transport = vi.fn().mockResolvedValue({ data: { sourceArtifact: { id: 'artifact', period, mimeType: 'application/pdf', contentHash: 'hash', financialAccountId: 'account', originalFiles: [{ fileId: 'file' }] }, financialAccount: { id: 'account', sourceKind: 'BANK' } } });
    await expect(preflightChasePdfImport(transport, input)).resolves.toEqual({ ready: true, missing: [], fileCount: 1 });
  });
  it('reports custody gaps without exposing record contents', async () => {
    const transport = vi.fn().mockResolvedValue({ data: { sourceArtifact: { period: '2024-11', mimeType: 'text/plain', contentHash: 'other', financialAccountId: null, originalFiles: [] }, financialAccount: { sourceKind: 'CARD' } } });
    await expect(preflightChasePdfImport(transport, input)).resolves.toMatchObject({ ready: false, missing: expect.arrayContaining(['pdfFile', 'contentHash', 'accountBinding', 'retainedFile']) });
  });
});
