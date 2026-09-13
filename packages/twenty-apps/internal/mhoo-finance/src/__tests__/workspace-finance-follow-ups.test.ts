import { describe, expect, it, vi } from 'vitest';
import type { RestApiClient } from 'twenty-client-sdk/rest';

import {
  approveWorkspaceFinanceDraft,
  updateWorkspaceFinanceFollowUpState,
} from '../investigation/workspace-finance-follow-ups';

describe('user-scoped native Task Finance mutations', () => {
  it('persists and verifies a bounded review transition', async () => {
    const patch = vi.fn().mockResolvedValue({});
    const get = vi.fn().mockImplementation(async () => {
      const update = patch.mock.calls[0][1];
      return {
        data: {
          task: {
            id: '20202020-0001-4e7c-8001-123456789def',
            ...update,
          },
        },
      };
    });
    const result = await updateWorkspaceFinanceFollowUpState(
      {
        taskId: '20202020-0001-4e7c-8001-123456789def',
        from: 'READY_FOR_REVIEW',
        to: 'RESOLVED',
        currentProvenance: '[]',
        at: '2026-09-14T00:00:00.000Z',
      },
      { patch, get } as unknown as RestApiClient,
    );
    expect(result.status).toBe('DONE');
    expect(patch).toHaveBeenCalledWith(
      '/rest/tasks/20202020-0001-4e7c-8001-123456789def',
      expect.objectContaining({ financeFollowUpState: 'RESOLVED' }),
    );
  });

  it('refuses a jump from To do straight to Resolved', async () => {
    await expect(
      updateWorkspaceFinanceFollowUpState(
        {
          taskId: '20202020-0001-4e7c-8001-123456789def',
          from: 'TO_DO',
          to: 'RESOLVED',
          currentProvenance: null,
          at: '2026-09-14T00:00:00.000Z',
        },
        {} as RestApiClient,
      ),
    ).rejects.toThrow('Invalid Finance follow-up transition');
  });

  it('approves a visible draft without sending it', async () => {
    const patch = vi.fn().mockResolvedValue({});
    const get = vi.fn().mockImplementation(async () => ({
      data: {
        task: {
          id: '20202020-0001-4e7c-8001-123456789def',
          ...patch.mock.calls[0][1],
        },
      },
    }));
    const result = await approveWorkspaceFinanceDraft(
      {
        taskId: '20202020-0001-4e7c-8001-123456789def',
        from: 'AWAITING_APPROVAL',
        currentProvenance: null,
        at: '2026-09-14T00:00:00.000Z',
      },
      { patch, get } as unknown as RestApiClient,
    );
    expect(result.financeEmailApproval).toBe('APPROVED_NOT_SENT');
    expect(JSON.parse(result.financeProvenanceHistory)).toEqual([
      expect.objectContaining({ action: 'EMAIL_DRAFT_APPROVED_NOT_SENT' }),
    ]);
  });
});
