import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { planChasePdfImport } from '../src/operator/chase-pdf-import';

const main = async () => {
const [pdfPath, artifactId, financialAccountId, accountKey] = process.argv.slice(2);
if (!pdfPath || !artifactId || !financialAccountId || !accountKey || process.argv.includes('--apply')) throw new Error('Usage: tsx scripts/plan-chase-pdf-import.ts <pdf> <artifactId> <financialAccountId> <accountKey>; --apply is unsupported.');
const pdfBytes = await readFile(pdfPath);
const extracted = spawnSync('pdftotext', ['-raw', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
if (extracted.status !== 0 || !extracted.stdout) throw new Error('Poppler pdftotext -raw extraction failed.');
const contentHash = createHash('sha256').update(pdfBytes).digest('hex');
const plan = planChasePdfImport({ artifact: { id: artifactId, artifactKey: artifactId, financialAccountId, accountKey, period: '2024-10', sourceKind: 'BANK', mimeType: 'application/pdf', originalFileName: 'operator-local.pdf', byteLength: pdfBytes.byteLength, contentHash, acquiredAt: new Date().toISOString(), acquiredBy: 'local-dry-run', originalFiles: [{ fileId: `local-${contentHash}` }] }, financialAccount: { id: financialAccountId, sourceKind: 'BANK' }, pdfBytes, extractedText: extracted.stdout });
// eslint-disable-next-line no-console -- intentionally emits only safe control outcomes.
console.log(JSON.stringify({ kind: 'CHASE_PDF_IMPORT_DRY_RUN_V2', status: plan.status, importedRows: plan.importedRows, duplicateRows: plan.duplicateRows, receiptKey: plan.receiptKey, sha256: contentHash }, null, 2));
};
void main();
