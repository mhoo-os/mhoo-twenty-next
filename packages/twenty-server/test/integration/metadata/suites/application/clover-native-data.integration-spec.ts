import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { executeLogicFunction } from 'test/integration/metadata/suites/logic-function/utils/execute-logic-function.util';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import request from 'supertest';
import { type Manifest } from 'twenty-shared/application';
import { setupApplicationForSync } from './utils/setup-application-for-sync.util';
import { syncApplication } from './utils/sync-application.util';
import { uploadApplicationFile } from './utils/upload-application-file.util';
import { generateApplicationToken } from './utils/generate-application-token.util';
import { buildBaseManifest } from './utils/build-base-manifest.util';
import { cleanupApplicationAndAppRegistration } from './utils/cleanup-application-and-app-registration.util';
import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

// This suite installs metadata and writes synthetic records. Never run on another DB.
const isolated = new URL(process.env.PG_DATABASE_URL!);
if (
  isolated.hostname !== '127.0.0.1' ||
  isolated.port !== '55441' ||
  isolated.pathname !== '/clover_native_synthetic'
)
  throw new Error('Dedicated Clover synthetic database required');
const output = resolve('../twenty-apps/internal/mhoo-clover/.twenty/output');
const clover: Manifest = JSON.parse(
  readFileSync(resolve(output, 'manifest.json'), 'utf8'),
);
const consumerId = randomUUID();
const roleId = randomUUID();
const consumer = buildBaseManifest({
  appId: consumerId,
  roleId,
  overrides: {
    roles: [
      {
        universalIdentifier: roleId,
        label: `Clover consumer ${consumerId}`,
        canReadAllObjectRecords: false,
        canUpdateAllObjectRecords: false,
        objectPermissions: [
          {
            universalIdentifier: randomUUID(),
            objectUniversalIdentifier: '27e1bebd-b3f0-462a-acf5-352879f11c5d',
            canReadObjectRecords: true,
            canUpdateObjectRecords: false,
            canSoftDeleteObjectRecords: false,
            canDestroyObjectRecords: false,
          },
        ],
      },
    ],
  },
});
let cloverToken: string;
let consumerToken: string;
const client = () => request(`http://localhost:${APP_PORT}`);
const observation = {
  merchantId: 'ABCDEFGHIJKLM',
  merchantName: 'Synthetic Clover proof',
  observedAt: '2026-09-07T00:00:00.000Z',
  sourceRevision: 'merchant-v1',
  sourcePath: '/v3/merchants/ABCDEFGHIJKLM?fields=id,name',
  scopeVerification: 'unknown',
};
const mint = async (universalIdentifier: string) => {
  const [app] = await globalThis.testDataSource.query(
    'SELECT id FROM core.application WHERE "universalIdentifier"=$1 AND "workspaceId"=$2',
    [universalIdentifier, SEED_APPLE_WORKSPACE_ID],
  );
  const result = await generateApplicationToken({ applicationId: app.id });
  expect(result.errors).toBeUndefined();
  return result.data.generateApplicationToken.applicationAccessToken.token;
};

describe('Clover native install and delegated source-record API', () => {
  beforeAll(async () => {
    await setupApplicationForSync({
      applicationUniversalIdentifier: consumerId,
      name: 'Synthetic Clover consumer',
      description: 'Synthetic only',
      sourcePath: 'clover-consumer-proof',
    });
    jest.useRealTimers();
  }, 60000);
  afterAll(async () => {
    jest.restoreAllMocks();
    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: consumerId,
    });
    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: clover.application.universalIdentifier,
    });
  }, 60000);
  it('rejects installing the consumer reference before Clover exists', async () => {
    const result = await syncApplication({
      manifest: consumer,
      expectToFail: true,
      dryRun: true,
    });
    expect(result.errors?.length).toBeGreaterThan(0);
  });
  it('installs the actual built Clover metadata and function bundles, then the consumer reference', async () => {
    await setupApplicationForSync({
      applicationUniversalIdentifier: clover.application.universalIdentifier,
      name: 'Clover',
      description: 'Synthetic only',
      sourcePath: 'clover-native-proof',
    });
    jest.useRealTimers();
    for (const fn of clover.logicFunctions) {
      for (const [fileFolder, filePath] of [
        ['Source', fn.sourceHandlerPath],
        ['BuiltLogicFunction', fn.builtHandlerPath],
      ]) {
        const result = await uploadApplicationFile({
          applicationUniversalIdentifier:
            clover.application.universalIdentifier,
          fileFolder,
          filePath,
          fileBuffer: readFileSync(resolve(output, filePath)),
          filename: filePath.split('/').pop()!,
          contentType: 'text/javascript',
        });
        expect(result.errors).toBeUndefined();
      }
    }
    const result = await syncApplication({ manifest: clover });
    expect(result.errors).toBeUndefined();
    expect(
      (await syncApplication({ manifest: consumer })).errors,
    ).toBeUndefined();
    cloverToken = await mint(clover.application.universalIdentifier);
    consumerToken = await mint(consumerId);
  }, 120000);
  it('allows delegated Clover creation and consumer reading, denies consumer writing and unauthenticated reading', async () => {
    const created = await client()
      .post('/rest/cloverMerchantObservations')
      .set('Authorization', `Bearer ${cloverToken}`)
      .send(observation);
    expect(created.status).toBe(201);
    const read = await client()
      .get('/rest/cloverMerchantObservations')
      .set('Authorization', `Bearer ${consumerToken}`);
    expect(read.status).toBe(200);
    expect(JSON.stringify(read.body)).toContain('Synthetic Clover proof');
    const denied = await client()
      .post('/rest/cloverMerchantObservations')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send(observation);
    expect(denied.status).toBe(400);
    expect(denied.body.messages[0]).toContain('does not have permission');
    expect(
      (await client().get('/rest/cloverMerchantObservations')).status,
    ).toBe(403);
  });
  it('persists independent connection progress, unique keys and native relation filters', async () => {
    const a = randomUUID();
    const b = randomUUID();
    const post = (path: string, body: object) =>
      client()
        .post(`/rest/${path}`)
        .set('Authorization', `Bearer ${cloverToken}`)
        .send(body);
    for (const id of [a, b]) {
      const result = await post('cloverConnections', {
        id,
        connectedAccountId: id,
        connectionKey: id,
        merchantId: id === a ? 'ABCDEFGHIJKLM' : 'NOPQRSTUVWXYZ',
        environment: 'production-na',
        status: 'observed',
      });
      expect(result.status).toBe(201);
    }
    const duplicate = await post('cloverConnections', { connectionKey: a });
    expect(duplicate.status).toBe(400);
    for (const id of [a, b]) {
      const result = await post('cloverSyncStates', {
        syncKey: `${id}:payments`,
        connectionId: id,
        dataset: 'payments',
        status: 'notStarted',
        coverage: 'unverified',
        grantRevision: 0,
      });
      expect(result.status).toBe(201);
    }
    const read = await client()
      .get('/rest/cloverSyncStates')
      .query({ filter: `connectionId[eq]:${a}` })
      .set('Authorization', `Bearer ${cloverToken}`);
    expect(read.status).toBe(200);
    expect(JSON.stringify(read.body)).toContain(a);
    expect(JSON.stringify(read.body)).not.toContain(b);
    const reverse = await client()
      .get(`/rest/cloverConnections/${a}`)
      .query({ depth: 1 })
      .set('Authorization', `Bearer ${cloverToken}`);
    expect(reverse.status).toBe(200);
    expect(JSON.stringify(reverse.body)).toContain('payments');
    const directUserWrite = await client()
      .post('/rest/cloverConnections')
      .set('Authorization', `Bearer ${APPLE_JANE_ADMIN_ACCESS_TOKEN}`)
      .send({ connectionKey: randomUUID() });
    expect(directUserWrite.status).toBe(400);
  });

  it('uses real authenticated intake/custody, denies another App credential access and disconnects natively', async () => {
    const config = getAppProviderByClassName<TwentyConfigService>(
      'TwentyConfigService',
    );
    const originalGet = config.get.bind(config);
    jest
      .spyOn(config, 'get')
      .mockImplementation(((key: string) =>
        key === 'CLOVER_TOKEN_WORKSPACE_ID'
          ? SEED_APPLE_WORKSPACE_ID
          : originalGet(key as never)) as never);
    const http = getAppProviderByClassName<SecureHttpClientService>(
      'SecureHttpClientService',
    );
    jest.spyOn(http, 'getHttpClient').mockReturnValue({
      get: jest.fn(async () => ({
        data: { id: observation.merchantId, name: observation.merchantName },
      })),
    } as never);
    const begin = await client()
      .post('/clover-token/begin')
      .set('Authorization', `Bearer ${APPLE_JANE_ADMIN_ACCESS_TOKEN}`)
      .send({ merchantId: observation.merchantId });
    expect(begin.status).toBe(200);
    const saved = await client()
      .post('/clover-token/submit')
      .set('Authorization', `Bearer ${APPLE_JANE_ADMIN_ACCESS_TOKEN}`)
      .send({
        requestId: begin.body.requestId,
        accessToken: 'synthetic-native-clover-proof-token',
        readOnlyConfirmed: true,
      });
    expect(saved.status).toBe(200);
    const id = saved.body.connectedAccountId;
    expect(id).toBeDefined();
    const lookup = (token: string) =>
      client().post('/metadata').set('Authorization', `Bearer ${token}`).send({
        query: 'query($id: ID!) { appConnection(id: $id) { id providerName } }',
        variables: { id },
      });
    expect((await lookup(cloverToken)).body.data.appConnection.id).toBe(id);
    expect((await lookup(consumerToken)).body.errors?.length).toBeGreaterThan(
      0,
    );
    const disconnected = await client()
      .post('/metadata')
      .set('Authorization', `Bearer ${APPLE_JANE_ADMIN_ACCESS_TOKEN}`)
      .send({
        query:
          'mutation($id: UUID!) { deleteConnectedAccount(id: $id) { id } }',
        variables: { id },
      });
    expect(disconnected.body.errors).toBeUndefined();
    expect((await lookup(cloverToken)).body.errors?.length).toBeGreaterThan(0);
    const [fn] = await globalThis.testDataSource.query(
      'SELECT id FROM core."logicFunction" WHERE "universalIdentifier"=$1 AND "workspaceId"=$2',
      ['0b1a54c5-36b4-4fbb-b467-832d2314eec1', SEED_APPLE_WORKSPACE_ID],
    );
    const execution = await executeLogicFunction({
      input: { id: fn.id, payload: {} },
    });
    expect(execution.errors).toBeUndefined();
    expect(execution.data.executeOneLogicFunction.status).toBe('ERROR');
    expect(
      execution.data.executeOneLogicFunction.error?.errorMessage,
    ).toContain('Clover connection unavailable');
  }, 60000);
});
