import { describe, expect, it, vi } from 'vitest';
import type { RestApiClient } from 'twenty-client-sdk/rest';

import {
  approveWorkspaceFinanceDraft,
  updateWorkspaceFinanceFollowUpState,
} from '../investigation/workspace-finance-follow-ups';

describe('user-scoped native Task Finance mutations', () => {
  const taskId = '20202020-0001-4e7c-8001-123456789def';
  const updatedAt = '2026-09-14T00:00:00.000Z';
  const personId = '65f1e8e2-3f37-4b6e-b257-9812d16cda16';
  const draftEmail = {
    mailboxLabel: 'Authorized mailbox',
    subject: 'Evidence request',
    body: 'Please share the receipt.',
    recipientPersonIds: [personId],
    attachmentReferences: [],
  } as const;
  const people = [
    { personId, name: 'Pat', role: 'Owner', selectedRecipient: true },
  ] as const;

  it('persists and verifies a bounded review transition', async () => {
    const patch = vi.fn().mockResolvedValue({});
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          task: {
            id: taskId,
            updatedAt,
            financeFollowUpState: 'READY_FOR_REVIEW',
            financeRevision: 0,
            financeProvenanceHistory: '[]',
          },
        },
      })
      .mockImplementation(async () => ({
        data: { task: { id: taskId, ...patch.mock.calls[0][1] } },
      }));
    const result = await updateWorkspaceFinanceFollowUpState(
      {
        taskId,
        from: 'READY_FOR_REVIEW',
        to: 'RESOLVED',
        expectedUpdatedAt: updatedAt,
        expectedRevision: 0,
        at: updatedAt,
      },
      { patch, get } as unknown as RestApiClient,
    );
    expect(result.status).toBe('DONE');
    expect(patch).toHaveBeenCalledWith(
      '/rest/tasks',
      expect.objectContaining({ financeFollowUpState: 'RESOLVED', financeRevision: 1 }),
      { query: { filter: `and(id[eq]:${taskId},financeRevision[eq]:0)` } },
    );
  });

  it('refuses a jump from To do straight to Resolved', async () => {
    await expect(
      updateWorkspaceFinanceFollowUpState(
        {
          taskId,
          from: 'TO_DO',
          to: 'RESOLVED',
          expectedUpdatedAt: updatedAt,
          expectedRevision: 0,
          at: updatedAt,
        },
        {} as RestApiClient,
      ),
    ).rejects.toThrow('Invalid Finance follow-up transition');
  });

  it('approves a visible draft without sending it', async () => {
    const patch = vi.fn().mockResolvedValue({});
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          task: {
            id: taskId,
            updatedAt,
            financeFollowUpState: 'WAITING_FOR_REPLY',
            financeEmailApproval: 'AWAITING_APPROVAL',
            financeRevision: 0,
            financeProvenanceHistory: null,
          },
        },
      })
      .mockImplementation(async () => ({
        data: { task: { id: taskId, ...patch.mock.calls[0][1] } },
      }));
    const result = await approveWorkspaceFinanceDraft(
      {
        taskId,
        from: 'AWAITING_APPROVAL',
        financeState: 'WAITING_FOR_REPLY',
        expectedUpdatedAt: updatedAt,
        expectedRevision: 0,
        draftEmail,
        people,
        at: updatedAt,
      },
      { patch, get } as unknown as RestApiClient,
    );
    expect(result.financeEmailApproval).toBe('APPROVED_NOT_SENT');
    expect(JSON.parse(result.financeProvenanceHistory)).toEqual([
      expect.objectContaining({ action: 'EMAIL_DRAFT_APPROVED_NOT_SENT' }),
    ]);
  });

  it('refuses stale state before writing and refuses a full provenance log', async () => {
    const patch = vi.fn();
    const staleGet = vi.fn().mockResolvedValue({
      data: {
        task: {
          id: taskId,
          updatedAt: '2026-09-14T00:00:01.000Z',
          financeFollowUpState: 'READY_FOR_REVIEW',
          financeRevision: 0,
          financeProvenanceHistory: '[]',
        },
      },
    });
    await expect(
      updateWorkspaceFinanceFollowUpState(
        {
          taskId,
          from: 'READY_FOR_REVIEW',
          to: 'RESOLVED',
          expectedUpdatedAt: updatedAt,
          expectedRevision: 0,
          at: updatedAt,
        },
        { get: staleGet, patch } as unknown as RestApiClient,
      ),
    ).rejects.toThrow('changed since it was read');

    const fullGet = vi.fn().mockResolvedValue({
      data: {
        task: {
          id: taskId,
          updatedAt,
          financeFollowUpState: 'READY_FOR_REVIEW',
          financeRevision: 0,
          financeProvenanceHistory: JSON.stringify(
            Array.from({ length: 100 }, () => ({ at: updatedAt, action: 'A' })),
          ),
        },
      },
    });
    await expect(
      updateWorkspaceFinanceFollowUpState(
        {
          taskId,
          from: 'READY_FOR_REVIEW',
          to: 'RESOLVED',
          expectedUpdatedAt: updatedAt,
          expectedRevision: 0,
          at: updatedAt,
        },
        { get: fullGet, patch } as unknown as RestApiClient,
      ),
    ).rejects.toThrow('reached its write bound');
    expect(patch).not.toHaveBeenCalled();
  });

  it('refuses approval when a draft recipient is not explicitly selected', async () => {
    const get = vi.fn();
    const patch = vi.fn();
    await expect(
      approveWorkspaceFinanceDraft(
        {
          taskId,
          from: 'AWAITING_APPROVAL',
          financeState: 'WAITING_FOR_REPLY',
          expectedUpdatedAt: updatedAt,
          expectedRevision: 0,
          draftEmail,
          people: [{ ...people[0], selectedRecipient: false }],
          at: updatedAt,
        },
        { get, patch } as unknown as RestApiClient,
      ),
    ).rejects.toThrow('no valid selected recipients');
    expect(get).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });
});
