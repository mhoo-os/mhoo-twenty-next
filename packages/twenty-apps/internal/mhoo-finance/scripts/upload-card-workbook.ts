import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const EXPECTED_REMOTE = 'https://hass-kitchen.mhoo.app';
const FILE_FIELD = 'c9e1d2f3-a4b5-4678-9012-3456789abc14';

async function main() {
  const [sourcePath, expectedHash] = process.argv.slice(2);
  if (!sourcePath || !/^[a-f0-9]{64}$/.test(expectedHash ?? '')) {
    throw new Error('Usage: upload-card-workbook.ts <xlsx-path> <reviewed-sha256>');
  }
  const bytes = await readFile(sourcePath);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== expectedHash) throw new Error('Source workbook hash changed.');
  if (!basename(sourcePath).toLowerCase().endsWith('.xlsx')) throw new Error('Expected XLSX source.');

  const config = JSON.parse(await readFile('/Users/mhoooo/.twenty/config.json', 'utf8')) as {
    remotes: Record<string, { apiUrl?: string; apiKey?: string }>;
  };
  const remote = config.remotes['finance-install-20260914'];
  if (remote?.apiUrl !== EXPECTED_REMOTE || !remote.apiKey) throw new Error('Expected Hass Kitchen remote is unavailable.');

  const form = new FormData();
  form.append('operations', JSON.stringify({
    query: 'mutation UploadFinanceEvidence($file: Upload!, $fieldMetadataUniversalIdentifier: String!) { uploadFilesFieldFileByUniversalIdentifier(file: $file, fieldMetadataUniversalIdentifier: $fieldMetadataUniversalIdentifier) { id size } }',
    variables: { file: null, fieldMetadataUniversalIdentifier: FILE_FIELD },
  }));
  form.append('map', JSON.stringify({ '0': ['variables.file'] }));
  form.append('0', new Blob([new Uint8Array(bytes)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), basename(sourcePath));
  const response = await fetch(`${remote.apiUrl}/metadata`, {
    method: 'POST', headers: { authorization: `Bearer ${remote.apiKey}` }, body: form,
  });
  if (!response.ok) throw new Error(`Twenty upload HTTP ${response.status}`);
  const payload = await response.json() as {
    data?: { uploadFilesFieldFileByUniversalIdentifier?: { id: string; size: number } };
    errors?: Array<{ message: string }>;
  };
  const file = payload.data?.uploadFilesFieldFileByUniversalIdentifier;
  if (payload.errors?.length || !file || file.size !== bytes.length) throw new Error('Twenty upload verification failed.');
  // Deliberately omit the credential, signed URL, and workbook contents.
  console.log(JSON.stringify({ fileId: file.id, bytes: file.size, sha256: hash }));
}

void main().catch((error: unknown) => {
  console.error('CARD_WORKBOOK_UPLOAD_FAILED', error instanceof Error ? error.message : 'unknown');
  process.exitCode = 1;
});
