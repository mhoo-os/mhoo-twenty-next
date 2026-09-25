import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineLogicFunction } from 'twenty-sdk/define';
import { RetryableLogicFunctionError } from 'twenty-sdk/logic-function';

import {
  CHASE_CHECKING_BATCH_KEY,
  CHASE_CHECKING_REVIEWED_TOTAL_ROWS,
  HASS_CHASE_CHECKING_ACCOUNT_ID,
  REVIEWED_CHASE_CHECKING_PERIODS,
  createChaseCheckingBatchState,
  nextChaseCheckingBatchCommand,
  parseChaseCheckingBatchState,
  type ChaseCheckingBatchCommand,
  type ChaseCheckingBatchState,
} from '../ingestion/chase-checking-batch-state';
import {
  CHASE_CHECKING_EXTRACTION_HANDOFF_PROFILE,
  CHASE_CHECKING_EXTRACTION_HANDOFF_VERSION,
  CHASE_CHECKING_IMPORT_FUNCTION,
  createNativeChaseCheckingBatchStateStore,
  type ChaseCheckingBatchStateStore,
  type ChaseCheckingCoreClient,
} from './chase-checking-import-job';

export const CHASE_CHECKING_IMPORT_KICKOFF_FUNCTION =
  'f15d64a4-f6d6-4c5e-a28b-1a7b8fa2e685';
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 1_000;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;

export type ChaseCheckingImportKickoffPayload = Readonly<{
  batchKey: typeof CHASE_CHECKING_BATCH_KEY;
}>;

export type ChaseCheckingImportKickoffResult = Readonly<{
  status: 'STARTED' | 'ALREADY_RUNNING' | 'COMPLETE';
  batchKey: typeof CHASE_CHECKING_BATCH_KEY;
  stage: ChaseCheckingBatchState['stage'];
  revision: number;
  currentPeriodIndex: number;
  queued: boolean;
  nextCommand: ChaseCheckingBatchCommand | null;
}>;

export type ChaseCheckingImportKickoffDependencies = Readonly<{
  core: ChaseCheckingCoreClient;
  stateStore: ChaseCheckingBatchStateStore;
  now: () => string;
  enqueue: (command: ChaseCheckingBatchCommand) => Promise<void>;
}>;

class ChaseCheckingImportKickoffValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChaseCheckingImportKickoffValidationError';
  }
}

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown, label: string): JsonRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ChaseCheckingImportKickoffValidationError(`${label} is missing.`);
  }
  return value as JsonRecord;
};

const asString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ChaseCheckingImportKickoffValidationError(`${label} is missing.`);
  }
  return value;
};

const asSafeId = (value: unknown, label: string): string => {
  const result = asString(value, label);
  if (!SAFE_ID.test(result)) {
    throw new ChaseCheckingImportKickoffValidationError(`${label} is invalid.`);
  }
  return result;
};

const singleHandoffNode = (value: unknown): JsonRecord => {
  const root = asRecord(value, 'Extraction handoff lookup');
  const connection = asRecord(root.chasePdfExtractions, 'Extraction handoff connection');
  if (!Array.isArray(connection.edges) || connection.edges.length !== 1) {
    throw new ChaseCheckingImportKickoffValidationError('Each reviewed extraction handoff must resolve exactly one record.');
  }
  return asRecord(asRecord(connection.edges[0], 'Extraction handoff edge').node, 'Extraction handoff node');
};

const extractionQuery = (handoffKey: string) => ({
  chasePdfExtractions: {
    __args: { first: 2, filter: { handoffKey: { eq: handoffKey } } },
    edges: {
      node: {
        id: true,
        handoffKey: true,
        sourceArtifact: { id: true, contentHash: true },
        sourcePdfHash: true,
        parserProfile: true,
        parserVersion: true,
        extractionMimeType: true,
        textByteLength: true,
        pageCount: true,
        extractionFiles: { fileId: true },
      },
    },
  },
});

const handoffKeyFor = (contentHash: string): string =>
  `chase-pdf-extraction:${contentHash}`;

/**
 * Check the operator-owned extraction handoff before allowing the app-owned
 * background worker to start. The worker repeats all checks and reads bytes;
 * this gate only prevents a kickoff with missing or mixed-period evidence.
 */
export const verifyReviewedChaseCheckingHandoffs = async (
  core: ChaseCheckingCoreClient,
): Promise<void> => {
  const handoffs = await Promise.all(REVIEWED_CHASE_CHECKING_PERIODS.map(async (expected) => {
    const node = singleHandoffNode(await core.query(extractionQuery(handoffKeyFor(expected.contentHash))));
    const sourceArtifact = asRecord(node.sourceArtifact, 'Extraction source artifact');
    const files = node.extractionFiles;
    if (
      asString(node.handoffKey, 'Extraction handoff key') !== handoffKeyFor(expected.contentHash) ||
      asString(node.sourcePdfHash, 'Extraction source PDF hash') !== expected.contentHash ||
      asString(sourceArtifact.contentHash, 'Extraction source artifact hash') !== expected.contentHash ||
      asString(node.parserProfile, 'Extraction parser profile') !== CHASE_CHECKING_EXTRACTION_HANDOFF_PROFILE ||
      node.parserVersion !== CHASE_CHECKING_EXTRACTION_HANDOFF_VERSION ||
      asString(node.extractionMimeType, 'Extraction MIME type') !== 'text/plain' ||
      !Number.isSafeInteger(node.textByteLength) || (node.textByteLength as number) < 1 ||
      !Number.isSafeInteger(node.pageCount) || ![2, 4, 6, 8].includes(node.pageCount as number) ||
      !Array.isArray(files) || files.length !== 1 ||
      asSafeId(sourceArtifact.id, 'Extraction source artifact ID').length < 1 ||
      asSafeId(asRecord(files[0], 'Extraction File').fileId, 'Extraction File ID').length < 1
    ) {
      throw new ChaseCheckingImportKickoffValidationError(`Extraction handoff is not ready for ${expected.period}.`);
    }
    return expected.contentHash;
  }));
  if (new Set(handoffs).size !== REVIEWED_CHASE_CHECKING_PERIODS.length) {
    throw new ChaseCheckingImportKickoffValidationError('Reviewed extraction handoffs contain duplicate source hashes.');
  }
};

const validatePayload = (value: unknown): ChaseCheckingImportKickoffPayload => {
  const payload = asRecord(value, 'Chase checking kickoff payload');
  if (payload.batchKey !== CHASE_CHECKING_BATCH_KEY || Object.keys(payload).some((key) => key !== 'batchKey')) {
    throw new ChaseCheckingImportKickoffValidationError('Kickoff requires exactly the reviewed batchKey.');
  }
  return payload as unknown as ChaseCheckingImportKickoffPayload;
};

export const runChaseCheckingImportKickoff = async (
  rawPayload: unknown,
  dependencies: ChaseCheckingImportKickoffDependencies,
): Promise<ChaseCheckingImportKickoffResult> => {
  const payload = validatePayload(rawPayload);
  await verifyReviewedChaseCheckingHandoffs(dependencies.core);

  let state = await dependencies.stateStore.get(payload.batchKey);
  let started = false;
  if (!state) {
    const initial = createChaseCheckingBatchState(dependencies.now());
    try {
      await dependencies.stateStore.create(payload.batchKey, initial);
      started = true;
    } catch (error) {
      state = await dependencies.stateStore.get(payload.batchKey);
      if (!state) throw error;
    }
    state ??= await dependencies.stateStore.get(payload.batchKey);
    if (!state) throw new ChaseCheckingImportKickoffValidationError('Kickoff state creation readback failed.');
  }

  const parsed = parseChaseCheckingBatchState(state);
  if (parsed.batchKey !== payload.batchKey || parsed.accountId !== HASS_CHASE_CHECKING_ACCOUNT_ID || parsed.totalExpectedRows !== CHASE_CHECKING_REVIEWED_TOTAL_ROWS || parsed.sourceKind !== 'BANK') {
    throw new ChaseCheckingImportKickoffValidationError('Persisted state is not the reviewed Hass Chase BANK batch.');
  }
  const command = nextChaseCheckingBatchCommand(parsed);
  if (!command) {
    return { status: 'COMPLETE', batchKey: parsed.batchKey, stage: parsed.stage, revision: parsed.revision, currentPeriodIndex: parsed.currentPeriodIndex, queued: false, nextCommand: null };
  }
  await dependencies.enqueue(command);
  return {
    status: started ? 'STARTED' : 'ALREADY_RUNNING',
    batchKey: parsed.batchKey,
    stage: parsed.stage,
    revision: parsed.revision,
    currentPeriodIndex: parsed.currentPeriodIndex,
    queued: true,
    nextCommand: command,
  };
};

const enqueueApplicationJob = async (command: ChaseCheckingBatchCommand): Promise<void> => {
  if (!process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN) throw new Error('Native App execution is required.');
  const result = await new MetadataApiClient({ runAs: 'application' }).mutation({
    enqueueJobs: {
      __args: {
        input: {
          logicFunctionUniversalIdentifier: CHASE_CHECKING_IMPORT_FUNCTION,
          payloads: [command],
          retryLimit: RETRY_LIMIT,
          delayMs: RETRY_DELAY_MS,
        },
      },
      enqueued: true,
      logicFunctionUniversalIdentifier: true,
      enqueuedJobsCount: true,
    },
  });
  if (!result.enqueueJobs.enqueued || result.enqueueJobs.enqueuedJobsCount !== 1 || result.enqueueJobs.logicFunctionUniversalIdentifier !== CHASE_CHECKING_IMPORT_FUNCTION) {
    throw new RetryableLogicFunctionError('Native first-stage dispatch was not confirmed.');
  }
};

export const handler = async (
  payload: ChaseCheckingImportKickoffPayload,
  context: { userWorkspaceId: string | null; workspaceMemberId: string | null },
): Promise<ChaseCheckingImportKickoffResult> => {
  if (!context.userWorkspaceId || !context.workspaceMemberId) {
    throw new Error('Chase checking kickoff requires an authenticated Workspace user.');
  }
  if (!process.env.TWENTY_APP_APPLICATION_ACCESS_TOKEN) throw new Error('Native App execution is required.');
  const core = new CoreApiClient({ runAs: 'application' }) as unknown as ChaseCheckingCoreClient;
  try {
    return await runChaseCheckingImportKickoff(payload, {
      core,
      stateStore: createNativeChaseCheckingBatchStateStore(core),
      now: () => new Date().toISOString(),
      enqueue: enqueueApplicationJob,
    });
  } catch (error) {
    if (error instanceof RetryableLogicFunctionError) throw error;
    if (error instanceof ChaseCheckingImportKickoffValidationError) throw error;
    throw new RetryableLogicFunctionError('Chase checking kickoff could not confirm its bounded I/O.');
  }
};

export default defineLogicFunction({
  universalIdentifier: CHASE_CHECKING_IMPORT_KICKOFF_FUNCTION,
  name: 'chase-checking-import-kickoff',
  description: 'Authenticated kickoff for the reviewed Hass Chase checking background import.',
  timeoutSeconds: 90,
  handler,
});
