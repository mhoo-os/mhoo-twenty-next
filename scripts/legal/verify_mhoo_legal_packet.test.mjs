import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CANONICAL_MANIFEST_FILENAME,
  CANONICAL_MANIFEST_SHA256,
  verifyLegalPacket,
} from './verify_mhoo_legal_packet.mjs';

const SCRIPT_PATH = fileURLToPath(
  new URL('./verify_mhoo_legal_packet.mjs', import.meta.url),
);
const SOURCE_DIRECTORY = join(
  dirname(dirname(dirname(SCRIPT_PATH))),
  'packages/twenty-front/src/legal/sources',
);

test('verifies the approved packet and emits a stable JSON receipt', () => {
  const receipt = verifyLegalPacket();

  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.packetId, 'MHOO-LEGAL-2026-v2.0');
  assert.equal(receipt.packetVersion, '2.0');
  assert.equal(receipt.dpaState, 'UNAVAILABLE_FAIL_CLOSED');
  assert.deepEqual(receipt.manifest, {
    path: CANONICAL_MANIFEST_FILENAME,
    bytes: 2198,
    sha256: CANONICAL_MANIFEST_SHA256,
  });
  assert.equal(receipt.files.length, 6);
  assert.deepEqual(
    receipt.files.map(({ path }) => path),
    [
      '01-mhoo-master-terms-v2.0.md',
      '02-mhoo-privacy-policy-v2.0.md',
      '03-mhoo-acceptable-use-policy-v2.0.md',
      '04-mhoo-open-source-notice-v2.0.md',
      '05-mhoo-dpa-availability-notice-v2.0.md',
      '06-mhoo-legal-approval-record-v2.0.md',
    ],
  );

  const cliReceipt = JSON.parse(
    execFileSync(process.execPath, [SCRIPT_PATH, '--json'], {
      encoding: 'utf8',
    }),
  );

  assert.deepEqual(cliReceipt, receipt);
});

test('fails closed when an approved source byte changes or an extra file appears', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'mhoo-legal-packet-'));
  const temporarySourceDirectory = join(temporaryRoot, 'sources');

  try {
    cpSync(SOURCE_DIRECTORY, temporarySourceDirectory, { recursive: true });

    const termsPath = join(
      temporarySourceDirectory,
      '01-mhoo-master-terms-v2.0.md',
    );
    const termsBytes = readFileSync(termsPath);
    termsBytes[0] = termsBytes[0] === 35 ? 36 : 35;
    writeFileSync(termsPath, termsBytes);

    assert.throws(
      () =>
        verifyLegalPacket({
          sourceDirectory: temporarySourceDirectory,
          manifestPath: join(
            temporarySourceDirectory,
            CANONICAL_MANIFEST_FILENAME,
          ),
        }),
      /does not match the approved manifest entry/,
    );

    cpSync(SOURCE_DIRECTORY, temporarySourceDirectory, { recursive: true });
    writeFileSync(join(temporarySourceDirectory, 'unexpected.md'), 'x\n');

    assert.throws(
      () =>
        verifyLegalPacket({
          sourceDirectory: temporarySourceDirectory,
          manifestPath: join(
            temporarySourceDirectory,
            CANONICAL_MANIFEST_FILENAME,
          ),
        }),
      /contains unexpected entries: unexpected\.md/,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
