import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const { FIXTURE_GENERATED_AT, buildFixtureDataset } = await import(
  '../src/fixtures/fixture-pack.ts'
);

const outputPath = resolve(process.cwd(), 'fixtures/mhoo-finance-fixture-pack.json');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify({ generatedAt: FIXTURE_GENERATED_AT, dataset: buildFixtureDataset('corrected') }, null, 2)}\n`,
  'utf8',
);
