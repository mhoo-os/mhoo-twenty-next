import { RestApiClient } from 'twenty-client-sdk/rest';
import { persistCloverPaymentPage } from '../../../../../../twenty-apps/internal/mhoo-clover/src/logic-functions/persist-clover-payment-page';
import { readCloverPayments } from '../../../../../../twenty-apps/internal/mhoo-clover/src/logic-functions/clover-payment-read';
import { type LogicFunctionExecutorService } from 'src/engine/core-modules/logic-function/logic-function-executor/logic-function-executor.service';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { executeLogicFunction } from 'test/integration/metadata/suites/logic-function/utils/execute-logic-function.util';
import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, rmSync } from 'fs';
import { Queue, Worker } from 'bullmq';
import { type ApplicationJobService } from 'src/engine/core-modules/application/application-job/services/application-job.service';
import {
  type LogicFunctionTriggerJob,
  type LogicFunctionTriggerJobData,
} from 'src/engine/core-modules/logic-function/logic-function-trigger/jobs/logic-function-trigger.job';
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
const paymentImportId = '1dbeb77b-d08e-4c36-90d8-e3012d14630b';
const providerFixturePath = `/tmp/mhoo-clover-native-queue-${randomUUID()}.json`;
// Only the disposable uploaded bundle gets this transport fault fixture.
// The committed App bundle has no provider override or test transport switch.
const providerFixturePrefix = `
import { readFileSync as proofRead, writeFileSync as proofWrite } from 'node:fs';
const proofOriginalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  const mode = JSON.parse(proofRead(${JSON.stringify(providerFixturePath)}, 'utf8'));
  if (url.origin === 'https://api.clover.com') {
    if (init?.method !== 'GET' || url.pathname !== '/v3/merchants/ABCDEFGHIJKLM/payments')
      throw new Error('Unexpected synthetic provider request');
    const from = Number(url.searchParams.getAll('filter')[0].split('>=')[1]);
    return Response.json({ elements: Number(url.searchParams.get('offset')) === 0 ?
      Array.from({length:100},(_,i)=>({id:i.toString(36).toUpperCase().padStart(13,'A'),amount:100,
        createdTime:from+1,modifiedTime:from+1,result:'SUCCESS'})) : [] });
  }
  if (url.origin !== 'http://localhost:4000') throw new Error('Unexpected proof egress');
  const enqueues = String(init?.body ?? '').includes('enqueueJobs');
  if (enqueues && mode.mode === 'fail-before') throw new Error('Synthetic unavailable dispatch');
  const response = await proofOriginalFetch(input, init);
  if (enqueues && mode.mode === 'lose-once') {
    proofWrite(${JSON.stringify(providerFixturePath)}, JSON.stringify({mode:'pass'}));
    throw new Error('Synthetic lost response after native enqueue');
  }
  return response;
};
`;
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
    writeFileSync(providerFixturePath, JSON.stringify({ mode: 'pass' }));
  }, 60000);
  afterAll(async () => {
    jest.restoreAllMocks();
    rmSync(providerFixturePath, { force: true });
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
          fileBuffer:
            fn.universalIdentifier === paymentImportId &&
            fileFolder === 'BuiltLogicFunction'
              ? Buffer.concat([
                  Buffer.from(providerFixturePrefix),
                  readFileSync(resolve(output, filePath)),
                ])
              : readFileSync(resolve(output, filePath)),
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

  it('persists payment revisions and replay receipts through the actual native API', async () => {
    const connectionId = randomUUID();
    const binding = {
      connectionId,
      merchantId: 'ABCDEFGHIJKLM',
      grantId: randomUUID(),
    };
    const connection = {
      id: connectionId,
      handle: binding.merchantId,
      providerName: 'clover-manual',
      accessToken: 'synthetic-provider-value',
      authFailedAt: null,
    };
    const page = await readCloverPayments(
      {
        connectionId,
        fromMs: 1000,
        toMs: 2000,
        timeField: 'modifiedTime',
        offset: 0,
      },
      {
        list: async () => [connection],
        get: async () => connection,
        fetch: async () =>
          Response.json({
            elements: Array.from({ length: 100 }, (_, index) => ({
              id: index.toString(36).toUpperCase().padStart(13, 'A'),
              amount: 100,
              createdTime: 1100,
              modifiedTime: 1500,
              result: 'SUCCESS',
            })),
          }),
      },
    );
    const dependencies = {
      client: new RestApiClient({
        baseUrl: `http://localhost:${APP_PORT}`,
        token: cloverToken,
      }),
      authorize: async () => {},
      now: () => new Date('2026-09-07T00:00:00Z'),
    };
    const saved = await persistCloverPaymentPage(page, binding, dependencies);
    expect(await persistCloverPaymentPage(page, binding, dependencies)).toEqual(
      saved,
    );
    for (const plural of ['cloverPaymentRevisions', 'cloverImportReceipts']) {
      const records = await client()
        .get(`/rest/${plural}`)
        .query({
          filter: `connectionId[eq]:${connectionId}`,
          depth: 0,
          limit: 100,
        })
        .set('Authorization', `Bearer ${cloverToken}`);
      expect(records.status).toBe(200);
      expect(records.body.data[plural]).toHaveLength(
        plural === 'cloverPaymentRevisions' ? 100 : 1,
      );
    }
    const reverse = await client()
      .get(`/rest/cloverConnections/${connectionId}`)
      .query({ depth: 1 })
      .set('Authorization', `Bearer ${cloverToken}`);
    expect(
      reverse.body.data.cloverConnection.paymentRevisions.length,
    ).toBeGreaterThan(0);
    expect(reverse.body.data.cloverConnection.importReceipts).toHaveLength(1);
    const rejectedKey = 'f'.repeat(64);
    const rejectedBatch = await client()
      .post('/rest/batch/cloverPaymentRevisions')
      .set('Authorization', `Bearer ${cloverToken}`)
      .send([
        { revisionKey: rejectedKey, connectionId },
        { revisionKey: page.revisions[0].revisionKey, connectionId },
      ]);
    expect(rejectedBatch.status).toBe(400);
    const rolledBack = await client()
      .get('/rest/cloverPaymentRevisions')
      .query({ filter: `revisionKey[eq]:${rejectedKey}` })
      .set('Authorization', `Bearer ${cloverToken}`);
    expect(rolledBack.body.data.cloverPaymentRevisions).toHaveLength(0);
    const denied = await client()
      .post('/rest/cloverImportReceipts')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({ pageKey: randomUUID() });
    expect(denied.status).toBe(400);
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
    const [syncFunction] = await globalThis.testDataSource.query(
      'SELECT id FROM core."logicFunction" WHERE "universalIdentifier"=$1 AND "workspaceId"=$2',
      ['8105a614-4235-4131-a363-b82a27f72be1', SEED_APPLE_WORKSPACE_ID],
    );
    const executor = getAppProviderByClassName<LogicFunctionExecutorService>(
      'LogicFunctionExecutorService',
    );
    const runBackground = (grantId: string) =>
      executor.execute({
        logicFunctionId: syncFunction.id,
        workspaceId: SEED_APPLE_WORKSPACE_ID,
        payload: { connectionId: id, grantId },
      });
    expect((await runBackground(randomUUID())).status).toBe('ERROR');
    const setGrant = (enabled: boolean, expectedGrantId: string | null) =>
      client()
        .post('/clover-token/background-grant')
        .set('Authorization', `Bearer ${APPLE_JANE_ADMIN_ACCESS_TOKEN}`)
        .send({ connectedAccountId: id, enabled, expectedGrantId });
    const untrustedGrant = {
      connectedAccountId: id,
      enabled: true,
      expectedGrantId: null,
    };
    expect(
      (
        await client()
          .post('/clover-token/background-grant')
          .send(untrustedGrant)
      ).status,
    ).toBe(403);
    expect(
      (
        await client()
          .post('/clover-token/background-grant')
          .set('Authorization', `Bearer ${consumerToken}`)
          .send(untrustedGrant)
      ).status,
    ).toBe(403);
    const granted = await setGrant(true, null);
    expect(granted.status).toBe(200);
    expect(granted.body.backgroundSyncEnabled).toBe(true);
    const grantId = granted.body.backgroundSyncGrantId;
    const allowedBackground = await runBackground(grantId);
    expect(allowedBackground.status).toBe('SUCCESS');
    expect(JSON.stringify(allowedBackground)).not.toContain(
      'synthetic-native-clover-proof-token',
    );
    // Real native enqueue -> Redis/BullMQ -> native trigger handler -> LOCAL executor.
    // Provider transport and native-enqueue response loss are the only injected faults.
    const [paymentFunction] = await globalThis.testDataSource.query(
      'SELECT id, "applicationId" FROM core."logicFunction" WHERE "universalIdentifier"=$1 AND "workspaceId"=$2',
      [paymentImportId, SEED_APPLE_WORKSPACE_ID],
    );
    const jobs = getAppProviderByClassName<ApplicationJobService>(
      'ApplicationJobService',
    );
    // Resolve the already booted native request-scoped provider; importing it
    // again through Jest would load a second engine dependency graph.
    const booted = global.app as unknown as {
      container: {
        getModules: () => Map<string, { providers: Map<unknown, unknown> }>;
      };
      resolve: (token: unknown) => Promise<LogicFunctionTriggerJob>;
    };
    const triggerToken = [...booted.container.getModules().values()]
      .flatMap((module) => [...module.providers.keys()])
      .find(
        (token) =>
          typeof token === 'function' &&
          token.name === 'LogicFunctionTriggerJob',
      );
    expect(triggerToken).toBeDefined();
    const nativeHandler = await booted.resolve(triggerToken);
    const redis = { host: '127.0.0.1', port: 56391 };
    const queue = new Queue<LogicFunctionTriggerJobData>(
      'logic-function-queue',
      { connection: redis },
    );
    const poll = async (condition: () => Promise<boolean>, timeout = 40000) => {
      const deadline = Date.now() + timeout;
      while (!(await condition())) {
        if (Date.now() > deadline)
          throw new Error('Synthetic queue proof timed out');
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    };
    let abandonAfterCommit = false;
    let didAbandon = false;
    const makeWorker = () => {
      const worker = new Worker<LogicFunctionTriggerJobData>(
        'logic-function-queue',
        async (job) => {
          if (job.data.logicFunctionId !== paymentFunction.id)
            throw new Error('Foreign synthetic job');
          await nativeHandler.handle(job.data, {
            retryLimit: Math.max(0, (job.opts.attempts ?? 1) - 1),
            updateData: (data) =>
              job.updateData(data as LogicFunctionTriggerJobData),
          });
          const payload = job.data.payload as {
            fromMs: number;
            offset: number;
          };
          if (
            abandonAfterCommit &&
            payload.fromMs === 3000 &&
            payload.offset === 0
          ) {
            abandonAfterCommit = false;
            didAbandon = true;
            await new Promise(() => {}); // Worker is force-closed before queue acknowledgement.
          }
        },
        {
          connection: redis,
          concurrency: 1,
          lockDuration: 5000,
          stalledInterval: 500,
          maxStalledCount: 1,
        },
      );
      worker.on('error', () => {});
      return worker;
    };
    // The booted test server may already consume this queue. Pause only those
    // disposable native workers while controlling the acknowledgement-loss point.
    const pausedNativeWorkers = new Set<Worker>();
    for (const module of booted.container.getModules().values()) {
      for (const wrapper of module.providers.values()) {
        const instance = (
          wrapper as { instance?: { workerMap?: Record<string, Worker> } }
        ).instance;
        const nativeWorker = instance?.workerMap?.['logic-function-queue'];
        if (nativeWorker) pausedNativeWorkers.add(nativeWorker);
      }
    }
    for (const nativeWorker of pausedNativeWorkers) await nativeWorker.pause();
    let worker = makeWorker();
    const enqueue = (
      fromMs: number,
      offset = 0,
      previousReceiptId: string | null = null,
    ) =>
      jobs.enqueueJobs({
        applicationId: paymentFunction.applicationId,
        workspaceId: SEED_APPLE_WORKSPACE_ID,
        userId: null,
        userWorkspaceId: null,
        input: {
          logicFunctionUniversalIdentifier: paymentImportId,
          retryLimit: 3,
          payloads: [
            {
              connectionId: id,
              grantId,
              fromMs,
              toMs: fromMs + 1000,
              timeField: 'modifiedTime',
              offset,
              previousReceiptId,
            },
          ],
        },
      });
    const ownedJobs = async () =>
      (
        await queue.getJobs([
          'waiting',
          'prioritized',
          'active',
          'delayed',
          'completed',
          'failed',
        ])
      ).filter((job) => job.data.logicFunctionId === paymentFunction.id);
    const settled = async () => {
      const pending = await queue.getJobs([
        'waiting',
        'prioritized',
        'active',
        'delayed',
      ]);
      return !pending.some(
        (job) => job.data.logicFunctionId === paymentFunction.id,
      );
    };
    const receipts = async (fromMs: number) => {
      const result = await client()
        .get('/rest/cloverImportReceipts')
        .query({
          filter: `and(connectionId[eq]:${id},fromMs[eq]:${fromMs})`,
          limit: 100,
        })
        .set('Authorization', `Bearer ${cloverToken}`);
      expect(result.status).toBe(200);
      return result.body.data.cloverImportReceipts as {
        id: string;
        offset: number;
      }[];
    };
    try {
      writeFileSync(providerFixturePath, JSON.stringify({ mode: 'lose-once' }));
      await enqueue(1000);
      await poll(settled);
      expect(await receipts(1000)).toHaveLength(2);
      const first = (await ownedJobs()).find(
        (job) =>
          (job.data.payload as { fromMs: number; offset: number }).fromMs ===
            1000 && (job.data.payload as { offset: number }).offset === 0,
      )!;
      expect(first.attemptsMade).toBeGreaterThan(1);

      writeFileSync(
        providerFixturePath,
        JSON.stringify({ mode: 'fail-before' }),
      );
      await enqueue(2000);
      await poll(settled);
      const exhausted = (await ownedJobs()).find(
        (job) =>
          (job.data.payload as { fromMs: number; offset: number }).fromMs ===
            2000 && (job.data.payload as { offset: number }).offset === 0,
      )!;
      expect(exhausted.data.applicationRetryCount).toBe(3);
      const pendingReceipts = await receipts(2000);
      expect(pendingReceipts).toHaveLength(1);
      expect(pendingReceipts[0].offset).toBe(0);
      writeFileSync(providerFixturePath, JSON.stringify({ mode: 'pass' }));
      await enqueue(2000, 100, pendingReceipts[0].id);
      await poll(settled);
      expect(await receipts(2000)).toHaveLength(2);

      abandonAfterCommit = true;
      await enqueue(3000);
      await poll(async () => didAbandon);
      await worker.close(true);
      worker = makeWorker();
      await poll(settled);
      expect(await receipts(3000)).toHaveLength(2);
      const revisions = await client()
        .get('/rest/cloverPaymentRevisions')
        .query({ filter: `connectionId[eq]:${id}`, limit: 500 })
        .set('Authorization', `Bearer ${cloverToken}`);
      // Native REST caps returned rows at 200; totalCount is the filtered count.
      expect(revisions.body.totalCount).toBe(300);
      expect(revisions.body.pageInfo.hasNextPage).toBe(true);
    } finally {
      await worker.close(true);
      for (const job of await ownedJobs()) await job.remove().catch(() => {});
      await queue.close();
      for (const nativeWorker of pausedNativeWorkers) nativeWorker.resume();
      writeFileSync(providerFixturePath, JSON.stringify({ mode: 'pass' }));
    }
    expect((await setGrant(false, null)).status).toBe(409);
    expect((await setGrant(false, grantId)).status).toBe(200);
    expect((await runBackground(grantId)).status).toBe('ERROR');
    const regranted = await setGrant(true, grantId);
    expect(regranted.status).toBe(200);
    expect(regranted.body.backgroundSyncGrantId).not.toBe(grantId);
    expect((await runBackground(grantId)).status).toBe('ERROR');
    expect(
      (await runBackground(regranted.body.backgroundSyncGrantId)).status,
    ).toBe('SUCCESS');
    const disconnected = await client()
      .post('/metadata')
      .set('Authorization', `Bearer ${APPLE_JANE_ADMIN_ACCESS_TOKEN}`)
      .send({
        query:
          'mutation($id: UUID!) { deleteConnectedAccount(id: $id) { id } }',
        variables: { id },
      });
    expect(disconnected.body.errors).toBeUndefined();
    expect(
      (await runBackground(regranted.body.backgroundSyncGrantId)).status,
    ).toBe('ERROR');
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
  }, 150000);
});
