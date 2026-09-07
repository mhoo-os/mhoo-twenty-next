import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { type Manifest } from 'twenty-shared/application';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { setupApplicationForSync } from './utils/setup-application-for-sync.util';
import { syncApplication } from './utils/sync-application.util';
import { uploadApplicationFile } from './utils/upload-application-file.util';
import { generateApplicationToken } from './utils/generate-application-token.util';
import { cleanupApplicationAndAppRegistration } from './utils/cleanup-application-and-app-registration.util';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type ApplicationTokenService } from 'src/engine/core-modules/auth/token/services/application-token.service';
const db = new URL(process.env.PG_DATABASE_URL!);
if (
  db.hostname !== '127.0.0.1' ||
  db.port !== '55441' ||
  db.pathname !== '/clover_native_synthetic' ||
  process.env.REDIS_URL !== 'redis://127.0.0.1:56391' ||
  process.env.SERVER_URL !== 'http://localhost:4000'
)
  throw new Error('Exact owned synthetic environment required');
const workspace = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const output = resolve('../twenty-apps/internal/mhoo-clover/.twenty/output');
const manifest: Manifest = JSON.parse(
  readFileSync(resolve(output, 'manifest.json'), 'utf8'),
);
const uid = manifest.application.universalIdentifier;
const api = () => request('http://localhost:4000');
const ids: string[] = [];
const handoffIds: string[] = [];
const authBaselines = new Map<string, Set<string>>();
const syntheticUserIds = [
  '20202020-e6b5-4680-8a32-b8209737156b',
  '20202020-9e3b-46d4-a556-88b9ddc2b034',
];
beforeEach(async () => {
  for (const table of ['userSession', 'appToken']) {
    const rows = await globalThis.testDataSource.query(
      `SELECT id FROM core."${table}" WHERE "userId" = ANY($1::uuid[])`,
      [syntheticUserIds],
    );
    authBaselines.set(
      table,
      new Set(rows.map((row: { id: string }) => row.id)),
    );
  }
});
let cleanupToken = APPLE_JANE_ADMIN_ACCESS_TOKEN;
let created = false;
const guard = `const nativeStatusFetch = globalThis.fetch; globalThis.fetch = (input, init) => { const u = new URL(String(input)); if(u.origin !== 'http://localhost:4000') throw new Error('Synthetic proof blocks external egress'); return nativeStatusFetch(input, init); };\n`;
const status = (token: string, body: unknown) =>
  api()
    .post('/s/clover/operator-status')
    .set('Authorization', `Bearer ${token}`)
    .send(body);

afterEach(async () => {
  for (const id of ids) {
    const result = await api()
      .post('/metadata')
      .set('Authorization', `Bearer ${cleanupToken}`)
      .send({
        query:
          'mutation($id: UUID!) { deleteConnectedAccount(id: $id) { id } }',
        variables: { id },
      });
    expect(result.body.errors).toBeUndefined();
  }
  if (created) {
    const rows = await globalThis.testDataSource.query(
      'SELECT "workspaceId" FROM core.application WHERE "universalIdentifier"=$1',
      [uid],
    );
    expect(
      rows.every(
        (row: { workspaceId: string }) => row.workspaceId === workspace,
      ),
    ).toBe(true);
    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: uid,
    });
    expect(
      (
        await globalThis.testDataSource.query(
          'SELECT id FROM core.application WHERE "universalIdentifier"=$1',
          [uid],
        )
      ).length,
    ).toBe(0);
  }
  for (const id of handoffIds)
    await globalThis.testDataSource.query(
      'DELETE FROM core."appToken" WHERE id=$1 AND type=$2 AND "workspaceId"=$3',
      [id, 'CLOVER_TOKEN_HANDOFF', workspace],
    );
  for (const table of ['userSession', 'appToken']) {
    const rows = await globalThis.testDataSource.query(
      `SELECT id FROM core."${table}" WHERE "userId" = ANY($1::uuid[])`,
      [syntheticUserIds],
    );
    for (const row of rows)
      if (!authBaselines.get(table)?.has(row.id))
        await globalThis.testDataSource.query(
          `DELETE FROM core."${table}" WHERE id=$1 AND "userId" = ANY($2::uuid[])`,
          [row.id, syntheticUserIds],
        );
  }
  handoffIds.length = 0;
  ids.length = 0;
  created = false;
  cleanupToken = APPLE_JANE_ADMIN_ACCESS_TOKEN;
  jest.restoreAllMocks();
}, 60000);

const installCandidate = async () => {
  const existing = await globalThis.testDataSource.query(
    'SELECT id FROM core.application WHERE "universalIdentifier"=$1',
    [uid],
  );
  expect(existing).toHaveLength(0);
  await setupApplicationForSync({
    applicationUniversalIdentifier: uid,
    name: 'Clover',
    description: 'Synthetic native status acceptance',
    sourcePath: 'clover-native-status-proof',
  });
  created = true;
  jest.useRealTimers();
  for (const fn of manifest.logicFunctions)
    for (const [folder, path] of [
      ['Source', fn.sourceHandlerPath],
      ['BuiltLogicFunction', fn.builtHandlerPath],
    ]) {
      const file = readFileSync(resolve(output, path));
      const result = await uploadApplicationFile({
        applicationUniversalIdentifier: uid,
        fileFolder: folder,
        filePath: path,
        filename: path.split('/').pop()!,
        contentType: 'text/javascript',
        fileBuffer:
          folder === 'BuiltLogicFunction'
            ? Buffer.concat([Buffer.from(guard), file])
            : file,
      });
      expect(result.errors).toBeUndefined();
    }
  for (const fc of manifest.frontComponents)
    for (const [folder, path] of [
      ['Source', fc.sourceComponentPath],
      ['BuiltFrontComponent', fc.builtComponentPath],
    ]) {
      const result = await uploadApplicationFile({
        applicationUniversalIdentifier: uid,
        fileFolder: folder,
        filePath: path,
        filename: path.split('/').pop()!,
        contentType: 'text/javascript',
        fileBuffer: readFileSync(resolve(output, path)),
      });
      expect(result.errors).toBeUndefined();
    }
  expect((await syncApplication({ manifest })).errors).toBeUndefined();
  const [app] = await globalThis.testDataSource.query(
    'SELECT id FROM core.application WHERE "universalIdentifier"=$1 AND "workspaceId"=$2',
    [uid, workspace],
  );
  return app;
};

const prepareStatusData = async (
  app: { id: string },
  actorToken = APPLE_JANE_ADMIN_ACCESS_TOKEN,
) => {
  cleanupToken = actorToken;
  const minted = await generateApplicationToken({ applicationId: app.id });
  expect(minted.errors).toBeUndefined();
  const delegated =
    minted.data.generateApplicationToken.applicationAccessToken.token;
  const service = getAppProviderByClassName<ApplicationTokenService>(
    'ApplicationTokenService',
  );
  const background = (
    await service.generateApplicationAccessToken({
      workspaceId: workspace,
      applicationId: app.id,
    })
  ).token;
  const config = getAppProviderByClassName<TwentyConfigService>(
    'TwentyConfigService',
  );
  const original = config.get.bind(config);
  jest
    .spyOn(config, 'get')
    .mockImplementation(((key: string) =>
      key === 'CLOVER_TOKEN_WORKSPACE_ID'
        ? workspace
        : original(key as never)) as never);
  let merchant = 'ABCDEFGHIJKLM';
  const http = getAppProviderByClassName<SecureHttpClientService>(
    'SecureHttpClientService',
  );
  jest.spyOn(http, 'getHttpClient').mockReturnValue({
    get: jest.fn(async () => ({
      data: { id: merchant, name: 'Synthetic status merchant' },
    })),
  } as never);
  for (const handle of ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ']) {
    merchant = handle;
    const begin = await api()
      .post('/clover-token/begin')
      .set('Authorization', `Bearer ${actorToken}`)
      .send({ merchantId: handle });
    expect(begin.status).toBe(200);
    handoffIds.push(begin.body.requestId);
    const saved = await api()
      .post('/clover-token/submit')
      .set('Authorization', `Bearer ${actorToken}`)
      .send({
        requestId: begin.body.requestId,
        accessToken: 'synthetic-status-proof-token',
        readOnlyConfirmed: true,
      });
    expect(saved.status).toBe(200);
    ids.push(saved.body.connectedAccountId);
  }
  const grant = async (enabled: boolean, expectedGrantId: string | null) =>
    api()
      .post('/clover-token/background-grant')
      .set('Authorization', `Bearer ${actorToken}`)
      .send({ connectedAccountId: ids[0], enabled, expectedGrantId });
  const granted = await grant(true, null);
  expect(granted.status).toBe(200);
  const grantId = granted.body.backgroundSyncGrantId;
  const write = (path: string, body: unknown) =>
    api()
      .post(`/rest/${path}`)
      .set('Authorization', `Bearer ${background}`)
      .send(body);
  expect(
    (
      await write('cloverConnections', {
        id: ids[0],
        connectedAccountId: ids[0],
        merchantId: 'ABCDEFGHIJKLM',
        environment: 'production-na',
        connectionKey: randomUUID(),
        status: 'observed',
      })
    ).status,
  ).toBe(201);
  for (const [at, count] of [
    ['2026-01-01T00:00:00.000Z', 0],
    ['2026-02-01T00:00:00.000Z', 12],
  ])
    expect(
      (
        await write('cloverImportReceipts', {
          connectionId: ids[0],
          pageKey: randomUUID(),
          requestKey: randomUUID(),
          dataset: 'payments',
          grantId,
          fromMs: 1000,
          toMs: 2000,
          timeField: 'modifiedTime',
          offset: 0,
          nextOffset: null,
          rowCount: count,
          revisionKeys: [],
          observedAt: at,
          coverage: 'unverified',
        })
      ).status,
    ).toBe(201);
  return { delegated, background, grant, grantId };
};

it('accepts bounded native status route and refuses untrusted identity/grants without provider egress', async () => {
  const app = await installCandidate();
  const { delegated, background, grant, grantId } =
    await prepareStatusData(app);
  const list = await status(delegated, { kind: 'list' });
  expect(list.status).toBe(200);
  expect(list.body.kind).toBe('available');
  expect(list.body.merchants).toHaveLength(2);
  const good = await status(delegated, {
    kind: 'status',
    connectionId: ids[0],
  });
  expect(good.status).toBe(200);
  expect(good.body.kind).toBe('available');
  expect(good.body.pages.map((p: { records: number }) => p.records)).toEqual([
    12, 0,
  ]);
  expect(good.headers['cache-control']).toBe('no-store');
  expect(JSON.stringify(good.body)).not.toContain(
    'synthetic-status-proof-token',
  );
  expect(
    (await status(delegated, { kind: 'status', connectionId: ids[1] })).body
      .kind,
  ).toBe('uncertain');
  expect((await status(background, { kind: 'list' })).body.kind).toBe('denied');
  expect(
    (await api().post('/s/clover/operator-status').send({ kind: 'list' }))
      .status,
  ).toBeGreaterThanOrEqual(400);
  const guest = await status(APPLE_PHIL_GUEST_ACCESS_TOKEN, { kind: 'list' });
  expect(guest.body.merchants).toEqual([]);
  expect(
    (await status(delegated, { kind: 'list', userWorkspaceId: workspace }))
      .status,
  ).toBe(400);
  expect(
    (await status(delegated, { kind: 'status', connectionId: randomUUID() }))
      .body.kind,
  ).toBe('missing');
  expect((await grant(false, grantId)).status).toBe(200);
  expect(
    (await status(delegated, { kind: 'status', connectionId: ids[0] })).body
      .kind,
  ).toBe('uncertain');
  expect((await grant(true, grantId)).status).toBe(200);
  const regranted = await status(delegated, {
    kind: 'status',
    connectionId: ids[0],
  });
  expect(
    regranted.body.pages.every(
      (p: { currentGrant: boolean }) => !p.currentGrant,
    ),
  ).toBe(true);
}, 180000);

it('denies foreign Workspace identity and Apple selector', async () => {
  await installCandidate();
  const foreignWorkspace = '3b8e6458-5fc1-4e63-8563-008ccddaa6db';
  const members = await globalThis.testDataSource.query(
    'SELECT "userId" FROM core."userWorkspace" WHERE "workspaceId"=$1 ORDER BY id LIMIT 1',
    [foreignWorkspace],
  );
  expect(members).toHaveLength(1);
  const service =
    getAppProviderByClassName<
      import('src/engine/core-modules/auth/token/services/access-token.service').AccessTokenService
    >('AccessTokenService');
  const { token } = await service.generateAccessToken({
    userId: members[0].userId,
    workspaceId: foreignWorkspace,
    authProvider:
      'password' as import('src/engine/core-modules/workspace/types/workspace.type').AuthProviderEnum,
  });
  const config = getAppProviderByClassName<TwentyConfigService>(
    'TwentyConfigService',
  );
  const original = config.get.bind(config);
  jest
    .spyOn(config, 'get')
    .mockImplementation(((key: string) =>
      key === 'CLOVER_TOKEN_WORKSPACE_ID'
        ? workspace
        : original(key as never)) as never);
  const http = getAppProviderByClassName<SecureHttpClientService>(
    'SecureHttpClientService',
  );
  jest.spyOn(http, 'getHttpClient').mockReturnValue({
    get: jest.fn(async () => ({
      data: { id: 'ABCDEFGHIJKLM', name: 'Synthetic foreign isolation' },
    })),
  } as never);
  const begin = await api()
    .post('/clover-token/begin')
    .set('Authorization', `Bearer ${APPLE_JANE_ADMIN_ACCESS_TOKEN}`)
    .send({ merchantId: 'ABCDEFGHIJKLM' });
  expect(begin.status).toBe(200);
  handoffIds.push(begin.body.requestId);
  const saved = await api()
    .post('/clover-token/submit')
    .set('Authorization', `Bearer ${APPLE_JANE_ADMIN_ACCESS_TOKEN}`)
    .send({
      requestId: begin.body.requestId,
      accessToken: 'synthetic-foreign-proof',
      readOnlyConfirmed: true,
    });
  expect(saved.status).toBe(200);
  ids.push(saved.body.connectedAccountId);
  for (const body of [
    { kind: 'list' },
    { kind: 'status', connectionId: ids[0] },
  ]) {
    const result = await status(token, body);
    expect([403, 404]).toContain(result.status);
    expect(result.body.merchants).toBeUndefined();
    expect(result.body.pages).toBeUndefined();
    expect(JSON.stringify(result.body)).not.toContain(ids[0]);
    expect(JSON.stringify(result.body)).not.toContain('ABCDEFGHIJKLM');
  }
});

it('renders installed native settings and refuses revoked status in browser', async () => {
  const app = await installCandidate();
  const service =
    getAppProviderByClassName<
      import('src/engine/core-modules/auth/token/services/access-token.service').AccessTokenService
    >('AccessTokenService');
  const { token: actorToken } = await service.generateAccessToken({
    userId: '20202020-9e3b-46d4-a556-88b9ddc2b034',
    workspaceId: workspace,
    authProvider:
      'password' as import('src/engine/core-modules/workspace/types/workspace.type').AuthProviderEnum,
  });
  const { grantId } = await prepareStatusData(app, actorToken);
  const { spawn } = await import('child_process');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [process.env.CLOVER_BROWSER_RUNNER!],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `Browser fixture failed (${code}): ${output.slice(-3000)}`,
            ),
          ),
    );
    child.stdin.end(
      JSON.stringify({
        applicationId: app.id,
        connectionId: ids[0],
        grantId,
        token: actorToken,
      }),
    );
  });
}, 180000);
