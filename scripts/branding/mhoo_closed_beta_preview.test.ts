import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertMhooClosedBetaPreview } from './mhoo_closed_beta_preview_validation';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const outputDirectory = process.env.MHOO_PREVIEW_OUTPUT;

if (!outputDirectory) {
  throw new Error(
    'MHOO_PREVIEW_OUTPUT must name the rendered preview directory',
  );
}

const referenceOutputDirectory = mkdtempSync(
  join(tmpdir(), 'mhoo-mho233-reference-'),
);

after(() => {
  rmSync(referenceOutputDirectory, { recursive: true, force: true });
});

const expectedFiles = [
  'emails/email-verification.html',
  'emails/invite.html',
  'emails/manifest.json',
  'emails/password-reset.html',
  'pages/manifest.json',
  'pages/unsubscribe-preferences.html',
  'pages/unsubscribe-result.html',
] as const;

const listFiles = (directory: string): string[] =>
  readdirSync(directory, { recursive: true })
    .map((entry) => resolve(directory, entry.toString()))
    .filter((entry) => statSync(entry).isFile())
    .map((entry) => relative(directory, entry))
    .sort();

const renderReferenceOutput = () => {
  const commonEnvironment = {
    ...process.env,
    MHOO_PREVIEW_OUTPUT: referenceOutputDirectory,
  };

  execFileSync(
    'yarn',
    ['tsx', 'scripts/branding/render_mhoo_closed_beta_emails.tsx'],
    {
      cwd: repositoryRoot,
      env: {
        ...commonEnvironment,
        TSX_TSCONFIG_PATH: 'packages/twenty-emails/tsconfig.json',
      },
      stdio: 'inherit',
    },
  );
  execFileSync(
    'yarn',
    ['tsx', 'scripts/branding/render_mhoo_closed_beta_pages.ts'],
    {
      cwd: repositoryRoot,
      env: {
        ...commonEnvironment,
        TSX_TSCONFIG_PATH: 'packages/twenty-server/tsconfig.json',
      },
      stdio: 'inherit',
    },
  );
};

test('renders exactly the five MHO-233 preview artifacts and two manifests', () => {
  assert.deepEqual(listFiles(outputDirectory), [...expectedFiles]);

  const emailManifest = JSON.parse(
    readFileSync(resolve(outputDirectory, 'emails/manifest.json'), 'utf8'),
  );
  const pageManifest = JSON.parse(
    readFileSync(resolve(outputDirectory, 'pages/manifest.json'), 'utf8'),
  );

  assert.equal(emailManifest.issue, 'MHO-233');
  assert.equal(pageManifest.issue, 'MHO-233');
  assert.equal(
    emailManifest.status,
    'DRAFT / UNAPPROVED — PRIVATE LOCAL PREVIEW',
  );
  assert.equal(
    pageManifest.status,
    'DRAFT / UNAPPROVED — PRIVATE LOCAL PREVIEW',
  );
  assert.equal(emailManifest.production, false);
  assert.equal(pageManifest.production, false);
  assert.equal(pageManifest.previewMutation, false);
  assert.equal(emailManifest.receipts.length, 3);
  assert.equal(pageManifest.receipts.length, 2);
});

test('keeps every rendered preview draft-labeled and free of upstream residue', () => {
  for (const file of expectedFiles.filter((file) => file.endsWith('.html'))) {
    const html = readFileSync(resolve(outputDirectory, file), 'utf8');

    assertMhooClosedBetaPreview({
      name: file,
      html,
      requiredMarkers: [
        'Mhoo',
        'Private beta preview',
        'DRAFT / UNAPPROVED',
        '/images/mhoo/mhoo-email-600x436.png',
      ],
    });
  }
});

test('renders byte-identical preview output on a second run', () => {
  renderReferenceOutput();

  assert.deepEqual(listFiles(referenceOutputDirectory), [...expectedFiles]);

  for (const file of expectedFiles) {
    assert.deepEqual(
      readFileSync(resolve(referenceOutputDirectory, file)),
      readFileSync(resolve(outputDirectory, file)),
      file,
    );
  }
});

test('rejects hostile Twenty and twenty.com residue', () => {
  const cleanHtml =
    'Mhoo Private beta preview DRAFT / UNAPPROVED ' +
    '/images/mhoo/mhoo-email-600x436.png';
  const requiredMarkers = [
    'Mhoo',
    'Private beta preview',
    'DRAFT / UNAPPROVED',
    '/images/mhoo/mhoo-email-600x436.png',
  ];

  for (const residue of ['Twenty', 'twenty.com']) {
    assert.throws(
      () =>
        assertMhooClosedBetaPreview({
          name: `hostile-${residue}`,
          html: `${cleanHtml} ${residue}`,
          requiredMarkers,
        }),
      new RegExp(`upstream residue.*${residue.replace('.', '\\.')}`),
    );
  }
});
