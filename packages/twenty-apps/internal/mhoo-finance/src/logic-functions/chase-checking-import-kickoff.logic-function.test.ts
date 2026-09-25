import { describe, expect, it } from 'vitest';

import {
  CHASE_CHECKING_BATCH_KEY,
  REVIEWED_CHASE_CHECKING_PERIODS,
} from '../ingestion/chase-checking-batch-state';
import { CHASE_CHECKING_PDF_CONTROLS_PROFILE } from '../ingestion/chase-pdf-controls';
import {
  runChaseCheckingImportKickoff,
  type ChaseCheckingImportKickoffDependencies,
} from './chase-checking-import-kickoff.logic-function';

const now = '2026-09-15T00:00:00.000Z';

const createHarness = (missingPeriod?: string) => {
  let stored: unknown = null;
  const queued: unknown[] = [];
  const core: ChaseCheckingImportKickoffDependencies['core'] = {
    query: async (request) => {
      const root = request as Record<string, unknown>;
      if (!('chasePdfExtractions' in root)) throw new Error('Unexpected kickoff query.');
      const extraction = root.chasePdfExtractions as Record<string, unknown>;
      const args = extraction.__args as Record<string, unknown>;
      const filter = args.filter as Record<string, Record<string, string>>;
      const key = filter.handoffKey.eq;
      const expected = REVIEWED_CHASE_CHECKING_PERIODS.find(({ contentHash }) => key === `chase-pdf-extraction:${contentHash}`);
      if (!expected || expected.period === missingPeriod) return { chasePdfExtractions: { edges: [] } };
      return {
        chasePdfExtractions: {
          edges: [{
            node: {
              id: `handoff-${expected.period}`,
              handoffKey: key,
              sourceArtifact: { id: `artifact-${expected.period}`, contentHash: expected.contentHash },
              sourcePdfHash: expected.contentHash,
              parserProfile: CHASE_CHECKING_PDF_CONTROLS_PROFILE.id,
              parserVersion: CHASE_CHECKING_PDF_CONTROLS_PROFILE.version,
              extractionMimeType: 'text/plain',
              textByteLength: 1,
              pageCount: 6,
              extractionFiles: [{ fileId: `text-${expected.period}` }],
            },
          }],
        },
      };
    },
    mutation: async () => { throw new Error('Kickoff should not mutate through Core.'); },
  };
  const dependencies: ChaseCheckingImportKickoffDependencies = {
    core,
    stateStore: {
      get: async () => stored,
      create: async (_key, state) => { stored = state; },
      compareAndSet: async () => { throw new Error('Kickoff does not CAS an existing state.'); },
    },
    now: () => now,
    enqueue: async (command) => { queued.push(command); },
  };
  return { dependencies, queued, getState: () => stored };
};

describe('Hass Chase checking import kickoff', () => {
  it('requires exactly the reviewed batch key and verifies every handoff before enqueue', async () => {
    const harness = createHarness();
    const result = await runChaseCheckingImportKickoff({ batchKey: CHASE_CHECKING_BATCH_KEY }, harness.dependencies);
    expect(result).toMatchObject({ status: 'STARTED', stage: 'PREFLIGHT', revision: 0, queued: true });
    expect(harness.queued).toEqual([{ stage: 'PREFLIGHT', periodIndex: 0, expectedRevision: 0 }]);
    await expect(runChaseCheckingImportKickoff({ batchKey: CHASE_CHECKING_BATCH_KEY, force: true }, harness.dependencies)).rejects.toThrow('exactly the reviewed batchKey');
  });

  it('re-reads existing state and requeues its current command on repeated kickoff', async () => {
    const harness = createHarness();
    await runChaseCheckingImportKickoff({ batchKey: CHASE_CHECKING_BATCH_KEY }, harness.dependencies);
    const repeated = await runChaseCheckingImportKickoff({ batchKey: CHASE_CHECKING_BATCH_KEY }, harness.dependencies);
    expect(repeated).toMatchObject({ status: 'ALREADY_RUNNING', stage: 'PREFLIGHT', revision: 0, queued: true });
    expect(harness.queued).toHaveLength(2);
  });

  it('fails closed when any reviewed extraction handoff is absent', async () => {
    const harness = createHarness('2026-08');
    await expect(runChaseCheckingImportKickoff({ batchKey: CHASE_CHECKING_BATCH_KEY }, harness.dependencies)).rejects.toThrow('exactly one record');
    expect(harness.getState()).toBeNull();
    expect(harness.queued).toHaveLength(0);
  });
});
