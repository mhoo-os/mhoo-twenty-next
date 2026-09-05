import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const {
  SYNTHETIC_BANK_CSV_V1,
  parseCsvStatement,
  parseQfxOfxStatement,
  reconcileStatementPeriod,
  retainUnparsedPdfArtifact,
} = await import('../src/ingestion/statement-importer.ts');

const fixture = (name) => readFileSync(resolve(process.cwd(), 'fixtures/ingestion', name));
const input = (artifactId, name, mimeType) => ({
  artifactId,
  accountKey: 'acct-synthetic-1234',
  sourceKind: 'BANK',
  originalFileName: name,
  mimeType,
  bytes: fixture(name),
  acquiredAt: '2026-09-05T12:00:00.000Z',
  acquiredBy: 'fixture-author',
  originalFileId: 'synthetic-files-reference-001',
});

const csv = parseCsvStatement(input('synthetic-csv-february-v1', 'synthetic-bank-february.csv', 'text/csv'), SYNTHETIC_BANK_CSV_V1);
const qfx = parseQfxOfxStatement(input('synthetic-qfx-february-v1', 'synthetic-bank-february.qfx', 'application/x-qfx'), 'QFX');
const pdf = retainUnparsedPdfArtifact(input('synthetic-pdf-missing-page-v1', 'synthetic-bank-statement-missing-page.pdf', 'application/pdf'), 3, [1, 3]);
const arithmetic = reconcileStatementPeriod(qfx);
if (csv.rejectedRows.length !== 0 || qfx.rejectedRows.length !== 0 || !arithmetic.matches || pdf.pageCompleteness !== 'MISSING_PAGES') process.exitCode = 1;
process.stdout.write(`${JSON.stringify({ csv: { receipt: csv.receipt, rows: csv.rows.length, rejectedRows: csv.rejectedRows.length }, qfx: { receipt: qfx.receipt, rows: qfx.rows.length, rejectedRows: qfx.rejectedRows.length, arithmetic }, pdf }, null, 2)}\n`);
