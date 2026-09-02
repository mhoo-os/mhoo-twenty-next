#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, '../..');
const DEFAULT_SOURCE_DIRECTORY = join(
  REPOSITORY_ROOT,
  'packages/twenty-front/src/legal/sources',
);
const DEFAULT_MANIFEST_PATH = join(
  DEFAULT_SOURCE_DIRECTORY,
  'mhoo-legal-packet-manifest-v2.0.json',
);

export const CANONICAL_PACKET_ID = 'MHOO-LEGAL-2026-v2.0';
export const CANONICAL_PACKET_VERSION = '2.0';
export const CANONICAL_MANIFEST_SHA256 =
  '57ffc6de05f1deb3c8db7b05fd9a1b7a09f7c8bc2996e1e859fbd2238ca227f5';
export const CANONICAL_MANIFEST_FILENAME =
  'mhoo-legal-packet-manifest-v2.0.json';

const CANONICAL_FILES = [
  {
    path: '01-mhoo-master-terms-v2.0.md',
    media_type: 'text/markdown; charset=utf-8',
    bytes: 6059,
    sha256: 'f8bfeb104b2b09064ef74a1f7e6bbae747ed9443fdc0d654a88d433b17daff16',
  },
  {
    path: '02-mhoo-privacy-policy-v2.0.md',
    media_type: 'text/markdown; charset=utf-8',
    bytes: 2155,
    sha256: 'd997c7fe762f8fe02043124ce6e43f482c77f5ac976649df37dcfad8d104867e',
  },
  {
    path: '03-mhoo-acceptable-use-policy-v2.0.md',
    media_type: 'text/markdown; charset=utf-8',
    bytes: 1217,
    sha256: '28c063f526be1752fa997529af80d105dfbfbb68a7e5ec4bea2c5ea770557ce8',
  },
  {
    path: '04-mhoo-open-source-notice-v2.0.md',
    media_type: 'text/markdown; charset=utf-8',
    bytes: 807,
    sha256: 'dd442db563d3472fe6ea57d899fa11bb2f1b4072f0de8282a63ba0971f1f70ee',
  },
  {
    path: '05-mhoo-dpa-availability-notice-v2.0.md',
    media_type: 'text/markdown; charset=utf-8',
    bytes: 799,
    sha256: '1836355ef5e2e65bb68c0943e8b7f9034d043dbf4b692151addab08d0edb81ce',
  },
  {
    path: '06-mhoo-legal-approval-record-v2.0.md',
    media_type: 'text/markdown; charset=utf-8',
    bytes: 5054,
    sha256: '96040a0a179eee3cf93b7a570febdc4bc42c39f8d1a1d971988e4a304e52f35c',
  },
];

const EXPECTED_SOURCE_NAMES = new Set([
  ...CANONICAL_FILES.map(({ path }) => path),
  CANONICAL_MANIFEST_FILENAME,
]);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const fail = (message) => {
  throw new Error(message);
};

const assertCanonicalText = (bytes, path) => {
  const text = bytes.toString('utf8');

  if (!Buffer.from(text, 'utf8').equals(bytes)) {
    fail(`${path} is not valid UTF-8`);
  }

  if (text.includes('\r')) {
    fail(`${path} contains CR line endings; expected LF`);
  }

  if (!text.endsWith('\n') || text.endsWith('\n\n')) {
    fail(`${path} must have exactly one terminal newline`);
  }
};

const assertSafeManifestPath = (path) => {
  if (
    path.length === 0 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((part) => part === '..') ||
    basename(path) !== path
  ) {
    fail(`manifest path is not a safe source filename: ${path}`);
  }
};

const readCanonicalFile = (path, expected) => {
  let bytes;

  try {
    bytes = readFileSync(path);
  } catch {
    fail(`missing legal packet source: ${path}`);
  }

  assertCanonicalText(bytes, path);

  const actualSha256 = sha256(bytes);
  if (bytes.length !== expected.bytes || actualSha256 !== expected.sha256) {
    fail(
      `${path} does not match the approved manifest entry ` +
        `(bytes=${bytes.length}, sha256=${actualSha256})`,
    );
  }

  return {
    path: expected.path,
    media_type: expected.media_type,
    bytes: bytes.length,
    sha256: actualSha256,
  };
};

const parseArguments = (argumentsList) => {
  const options = {
    json: false,
    sourceDirectory: DEFAULT_SOURCE_DIRECTORY,
    manifestPath: DEFAULT_MANIFEST_PATH,
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === '--json') {
      options.json = true;
      continue;
    }

    if (argument === '--source-dir' || argument === '--manifest') {
      const value = argumentsList[index + 1];
      if (!value) {
        fail(`${argument} requires a path`);
      }

      if (argument === '--source-dir') {
        options.sourceDirectory = resolve(value);
      } else {
        options.manifestPath = resolve(value);
      }
      index += 1;
      continue;
    }

    fail(`unknown argument: ${argument}`);
  }

  return options;
};

export const verifyLegalPacket = ({
  sourceDirectory = DEFAULT_SOURCE_DIRECTORY,
  manifestPath = DEFAULT_MANIFEST_PATH,
} = {}) => {
  const manifestBytes = readFileSync(manifestPath);
  assertCanonicalText(manifestBytes, manifestPath);

  const manifestSha256 = sha256(manifestBytes);
  if (manifestSha256 !== CANONICAL_MANIFEST_SHA256) {
    fail(
      `manifest hash mismatch: expected ${CANONICAL_MANIFEST_SHA256}, got ${manifestSha256}`,
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    fail(`manifest is not valid JSON: ${error.message}`);
  }

  if (
    manifest.schema !== 'mhoo-legal-packet-manifest/v1' ||
    manifest.packet_id !== CANONICAL_PACKET_ID ||
    manifest.packet_version !== CANONICAL_PACKET_VERSION ||
    manifest.status !== 'APPROVED_FINAL' ||
    manifest.dpa_state !== 'UNAVAILABLE_FAIL_CLOSED'
  ) {
    fail('manifest identity or fail-closed DPA state is not canonical');
  }

  if (
    manifest.canonicalization?.encoding !== 'UTF-8' ||
    manifest.canonicalization?.hash_algorithm !== 'SHA-256' ||
    manifest.canonicalization?.line_endings !== 'LF' ||
    manifest.canonicalization?.terminal_newline !== true
  ) {
    fail('manifest canonicalization rules are not canonical');
  }

  if (!Array.isArray(manifest.files)) {
    fail('manifest files must be an array');
  }

  const manifestPaths = manifest.files.map(({ path }) => path);
  const canonicalPaths = CANONICAL_FILES.map(({ path }) => path);
  if (JSON.stringify(manifestPaths) !== JSON.stringify(canonicalPaths)) {
    fail(
      'manifest file order or membership does not match the approved packet',
    );
  }

  const sourceEntries = readdirSync(sourceDirectory, { withFileTypes: true });
  const unexpectedEntries = sourceEntries
    .filter((entry) => !entry.isFile())
    .map((entry) => `${entry.name}/`)
    .concat(
      sourceEntries
        .filter(
          (entry) => entry.isFile() && !EXPECTED_SOURCE_NAMES.has(entry.name),
        )
        .map((entry) => entry.name),
    );
  if (unexpectedEntries.length > 0) {
    fail(
      `legal packet source directory contains unexpected entries: ${unexpectedEntries.sort().join(', ')}`,
    );
  }

  const files = manifest.files.map((manifestFile, index) => {
    const expected = CANONICAL_FILES[index];
    assertSafeManifestPath(manifestFile.path);

    if (
      manifestFile.media_type !== expected.media_type ||
      manifestFile.bytes !== expected.bytes ||
      manifestFile.sha256 !== expected.sha256
    ) {
      fail(
        `manifest entry does not match the approved receipt: ${manifestFile.path}`,
      );
    }

    return readCanonicalFile(
      join(sourceDirectory, manifestFile.path),
      expected,
    );
  });

  return {
    schema: 'mhoo-legal-packet-verification.v1',
    status: 'PASS',
    packetId: manifest.packet_id,
    packetVersion: manifest.packet_version,
    dpaState: manifest.dpa_state,
    manifest: {
      path: basename(manifestPath),
      bytes: manifestBytes.length,
      sha256: manifestSha256,
    },
    files,
  };
};

const main = () => {
  let options;

  try {
    options = parseArguments(process.argv.slice(2));
    const receipt = verifyLegalPacket(options);

    if (options.json) {
      console.log(JSON.stringify(receipt));
    } else {
      console.log('Mhoo Legal Packet v2.0 verification PASSED');
      console.log(`packet_id=${receipt.packetId}`);
      console.log(`manifest_sha256=${receipt.manifest.sha256}`);
      console.log(`files=${receipt.files.length}`);
      console.log(`dpa_state=${receipt.dpaState}`);
      console.log(`receipt_json=${JSON.stringify(receipt)}`);
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options?.json) {
      console.log(
        JSON.stringify({
          schema: 'mhoo-legal-packet-verification.v1',
          status: 'FAIL',
          error: message,
        }),
      );
    } else {
      console.error(`Mhoo Legal Packet v2.0 verification FAILED: ${message}`);
    }
    return 1;
  }
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main();
}
