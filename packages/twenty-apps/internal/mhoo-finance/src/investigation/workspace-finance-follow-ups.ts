import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';

import {
  financeNativeTaskStatus,
  hasExactSelectedRecipients,
  isFinanceFollowUpTransitionAllowed,
  parseFinanceProvenance,
  type FinanceDraftEmail,
  type FinanceFollowUpState,
  type FinanceFollowUpPerson,
} from './finance-follow-up-contract';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NativeTaskReceipt = Readonly<{
  id?: unknown;
  status?: unknown;
  financeFollowUpState?: unknown;
  financeEmailApproval?: unknown;
  financeProvenanceHistory?: unknown;
  updatedAt?: unknown;
}>;

const validatedProvenance = (value: string | null) => {
  if (!value) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    throw new Error('Invalid Finance provenance history');
  }
  if (!Array.isArray(raw) || raw.length > 100) {
    throw new Error('Invalid Finance provenance history');
  }
  const parsed = parseFinanceProvenance(value);
  if (parsed.length !== raw.length) {
    throw new Error('Invalid Finance provenance history');
  }
  return parsed;
};

const readTaskReceipt = async (
  taskId: string,
  client: RestApiClient,
): Promise<NativeTaskReceipt> => {
  const response = await client.get<{ data: { task?: NativeTaskReceipt } }>(
    `/rest/tasks/${taskId}`,
  );
  return response.data.task ?? {};
};

const assertFreshTask = (
  receipt: NativeTaskReceipt,
  input: Readonly<{
    taskId: string;
    expectedUpdatedAt: string;
    from: FinanceFollowUpState;
  }>,
) => {
  if (!input.expectedUpdatedAt) {
    throw new Error('Finance follow-up freshness receipt is unavailable');
  }
  if (
    receipt.id !== input.taskId ||
    receipt.updatedAt !== input.expectedUpdatedAt ||
    receipt.financeFollowUpState !== input.from
  ) {
    throw new Error('Finance follow-up changed since it was read');
  }
};

const appendProvenance = (
  current: unknown,
  event: Readonly<Record<string, string>>,
) => {
  if (
    current !== null &&
    current !== undefined &&
    typeof current !== 'string'
  ) {
    throw new Error('Invalid Finance provenance history');
  }
  const provenance = validatedProvenance(current ?? null);
  if (provenance.length >= 100) {
    throw new Error('Finance provenance history reached its write bound');
  }
  return JSON.stringify([...provenance, event]);
};

export const updateWorkspaceFinanceFollowUpState = async (
  input: Readonly<{
    taskId: string;
    from: FinanceFollowUpState;
    to: FinanceFollowUpState;
    expectedUpdatedAt: string;
    at: string;
  }>,
  client = new RestApiClient({ runAs: 'user' }),
) => {
  if (!UUID.test(input.taskId)) throw new Error('Invalid native Task identity');
  if (!isFinanceFollowUpTransitionAllowed(input.from, input.to)) {
    throw new Error('Invalid Finance follow-up transition');
  }
  const before = await readTaskReceipt(input.taskId, client);
  assertFreshTask(before, input);
  const expected = {
    financeFollowUpState: input.to,
    status: financeNativeTaskStatus(input.to),
    financeProvenanceHistory: appendProvenance(
      before.financeProvenanceHistory,
      {
        at: input.at,
        action: 'REVIEWER_STATE_CHANGED',
        from: input.from,
        to: input.to,
      },
    ),
  } as const;
  await client.patch(`/rest/tasks/${input.taskId}`, expected);
  const receipt = await readTaskReceipt(input.taskId, client);
  if (
    receipt.id !== input.taskId ||
    receipt.financeFollowUpState !== expected.financeFollowUpState ||
    receipt.status !== expected.status ||
    receipt.financeProvenanceHistory !== expected.financeProvenanceHistory
  ) {
    throw new Error('Finance follow-up state receipt mismatch');
  }
  return expected;
};

export const approveWorkspaceFinanceDraft = async (
  input: Readonly<{
    taskId: string;
    from: 'AWAITING_APPROVAL';
    financeState: FinanceFollowUpState;
    expectedUpdatedAt: string;
    draftEmail: FinanceDraftEmail;
    people: readonly FinanceFollowUpPerson[];
    at: string;
  }>,
  client = new RestApiClient({ runAs: 'user' }),
) => {
  if (!UUID.test(input.taskId)) throw new Error('Invalid native Task identity');
  if (input.from !== 'AWAITING_APPROVAL') {
    throw new Error('Finance email draft is not awaiting approval');
  }
  if (!hasExactSelectedRecipients(input.draftEmail, input.people)) {
    throw new Error('Finance email draft has no valid selected recipients');
  }
  const before = await readTaskReceipt(input.taskId, client);
  assertFreshTask(before, {
    taskId: input.taskId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    from: input.financeState,
  });
  if (before.financeEmailApproval !== input.from) {
    throw new Error('Finance email approval changed since it was read');
  }
  const expected = {
    financeEmailApproval: 'APPROVED_NOT_SENT',
    financeProvenanceHistory: appendProvenance(
      before.financeProvenanceHistory,
      {
        at: input.at,
        action: 'EMAIL_DRAFT_APPROVED_NOT_SENT',
      },
    ),
  } as const;
  await client.patch(`/rest/tasks/${input.taskId}`, expected);
  const receipt = await readTaskReceipt(input.taskId, client);
  if (
    receipt.id !== input.taskId ||
    receipt.financeEmailApproval !== expected.financeEmailApproval ||
    receipt.financeProvenanceHistory !== expected.financeProvenanceHistory
  ) {
    throw new Error('Finance email approval receipt mismatch');
  }
  return expected;
};

export const financeFollowUpMutationFailure = (
  error: unknown,
): 'denied' | 'failed' =>
  error instanceof RestApiClientError &&
  (error.status === 401 || error.status === 403)
    ? 'denied'
    : 'failed';
