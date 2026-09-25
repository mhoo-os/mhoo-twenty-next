import { describe, expect, it, vi } from 'vitest';
import type { CoreApiClient } from 'twenty-client-sdk/core';

import {
  normalizeWorkspaceAmount,
  readWorkspaceFinance,
  summarizeWorkspaceStatementCoverage,
  workspaceReadFailure,
} from '../investigation/workspace-finance-data';
import { SYNTHETIC_WORKSPACE_FINANCE_DATA } from '../investigation/synthetic-workspace-data';

describe('current Workspace Finance data adapter', () => {
  it.each([
    ['125', { amountMinor: '125', direction: 'in' }],
    ['-125', { amountMinor: '125', direction: 'out' }],
    ['0', { amountMinor: '0', direction: 'unknown' }],
    ['12.5', { amountMinor: null, direction: 'unknown' }],
    ['9223372036854775808', { amountMinor: null, direction: 'unknown' }],
    [undefined, { amountMinor: null, direction: 'unknown' }],
  ] as const)(
    'normalizes explicit signed minor units %s',
    (value, expected) => {
      expect(normalizeWorkspaceAmount(value)).toEqual(expected);
    },
  );

  it('maps only returned Workspace records and reports bounded truncation', async () => {
    const query = vi.fn().mockResolvedValue({
      financialAccounts: {
        pageInfo: { hasNextPage: false },
        edges: [
          {
            node: {
              id: 'account-1',
              accountLabel: 'Operating •1234',
              sourceKind: 'BANK',
            },
          },
        ],
      },
      financeFacts: {
        pageInfo: { hasNextPage: true },
        edges: [
          {
            node: {
              id: 'fact-1',
              factKey: 'fact-1',
              description: 'Deposit',
              exactAmountMinor: '2500',
              sourceCurrency: 'USD',
              transactionDate: '2024-12-31',
              postedDate: null,
              status: 'POSTED',
              classification: 'UNCLASSIFIED',
              includedInTotals: true,
              sourceLocation: 'bank.csv#2',
              financialAccount: {
                id: 'account-1',
                accountLabel: 'Operating •1234',
              },
              artifact: { id: 'artifact-1', artifactKey: 'bank-2024' },
            },
          },
        ],
      },
      sourceArtifacts: {
        pageInfo: { hasNextPage: false },
        edges: [
          {
            node: {
              id: 'artifact-1',
              artifactKey: 'chase-2024-10',
              accountKey: 'hass-chase-business-checking',
              financialAccount: {
                accountLabel: 'Hass Chase business checking',
              },
            },
          },
          {
            node: {
              id: 'artifact-unknown',
              artifactKey: 'other-2024-10',
              accountKey: 'unknown-account',
              financialAccount: null,
            },
          },
        ],
      },
      tasks: {
        pageInfo: { hasNextPage: false },
        edges: [
          {
            node: {
              id: '20202020-0001-4e7c-8001-123456789def',
              title: 'Clarify the deposit',
              status: 'IN_PROGRESS',
              dueAt: null,
              updatedAt: '2026-09-14T00:00:00.000Z',
              assignee: {
                name: { firstName: 'Finance', lastName: 'Reviewer' },
              },
              financeFollowUpState: 'READY_FOR_REVIEW',
              financeSubjectReferences: JSON.stringify([
                {
                  kind: 'TRANSACTION',
                  reference: 'fact-1',
                  label: 'Deposit',
                },
              ]),
              financePeopleContext: '[]',
              financeFindings: 'Receipt retained for review.',
              financeEvidenceReferences: '[]',
              financeDraftEmail: null,
              financeEmailApproval: null,
              financeScope: 'MHOO_FINANCE_V1',
              financeCorrelationKey: 'finance:fact-1',
              financeProvenanceHistory: '[]',
            },
          },
        ],
      },
    });

    const data = await readWorkspaceFinance({
      query,
    } as unknown as CoreApiClient);

    expect(data.accounts).toHaveLength(1);
    expect(data.facts).toEqual([
      expect.objectContaining({
        id: 'fact-1',
        date: '2024-12-31',
        direction: 'in',
        amountMinor: '2500',
        includedInTotals: true,
      }),
    ]);
    expect(data.statements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountKey: 'hass-chase-business-checking',
          accountLabel: 'Hass Chase business checking',
        }),
        expect.objectContaining({
          accountKey: 'unknown-account',
          accountLabel: 'unknown-account',
        }),
      ]),
    );
    expect(data.followUps).toEqual([
      expect.objectContaining({
        id: '20202020-0001-4e7c-8001-123456789def',
        state: 'READY_FOR_REVIEW',
        questionRoute: 'UNCHANGED',
        ownerName: 'Finance Reviewer',
        contractWarning: false,
      }),
    ]);
    expect(data.truncated).toBe(true);
    expect(data.statementsTruncated).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(data.facts)).toBe(true);
  });

  it('reads all 2,947 fact rows through bounded cursors before allowing totals', async () => {
    const total = 2947;
    const facts = Array.from({ length: total }, (_, index) => ({
      id: `fact-${index}`,
      factKey: `fact-${index}`,
      description: 'Imported row',
      exactAmountMinor: '100',
      sourceCurrency: 'USD',
      transactionDate: '2024-12-31',
      status: 'POSTED',
      classification: 'UNCLASSIFIED',
      includedInTotals: false,
    }));
    const page = (start: number) => ({
      pageInfo: {
        hasNextPage: start + 500 < total,
        endCursor: start + 500 < total ? String(start + 500) : null,
      },
      edges: facts.slice(start, start + 500).map((node) => ({ node })),
    });
    const query = vi.fn(async (request: { financialAccounts?: unknown; financeFacts?: { __args?: { after?: string } } }) => {
      if (request.financialAccounts) {
        return {
          financialAccounts: { pageInfo: { hasNextPage: false }, edges: [] },
          financeFacts: page(0),
          sourceArtifacts: { pageInfo: { hasNextPage: false }, edges: [] },
          tasks: { pageInfo: { hasNextPage: false }, edges: [] },
        };
      }
      return { financeFacts: page(Number(request.financeFacts?.__args?.after)) };
    });

    const data = await readWorkspaceFinance({
      query,
    } as unknown as CoreApiClient);

    expect(data.facts).toHaveLength(total);
    expect(data.truncated).toBe(false);
    expect(query).toHaveBeenCalledTimes(6);
  });

  it('fails closed when a follow-up fact page is denied', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        financialAccounts: { pageInfo: { hasNextPage: false }, edges: [] },
        financeFacts: {
          pageInfo: { hasNextPage: true, endCursor: 'next-page' },
          edges: [],
        },
        sourceArtifacts: { pageInfo: { hasNextPage: false }, edges: [] },
        tasks: { pageInfo: { hasNextPage: false }, edges: [] },
      })
      .mockRejectedValueOnce(new Error('403 Forbidden'));

    await expect(
      readWorkspaceFinance({ query } as unknown as CoreApiClient),
    ).rejects.toThrow('403 Forbidden');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('withholds statement coverage when a statement page is incomplete or a row count is absent', () => {
    expect(
      summarizeWorkspaceStatementCoverage(
        [
          {
            id: 'statement-1',
            artifactKey: 'statement-1',
            accountKey: 'account',
            accountLabel: 'Account',
            sourceKind: 'BANK',
            period: '2024-10',
            status: 'IMPORTED',
            originalFileName: 'statement.pdf',
            statementControls: null,
            rowCount: 83,
          },
        ],
        false,
      ),
    ).toEqual({ kind: 'available', importedStatements: 1, importedRows: 83 });
    expect(
      summarizeWorkspaceStatementCoverage([], true),
    ).toEqual({ kind: 'unavailable' });
    expect(
      summarizeWorkspaceStatementCoverage(
        [
          {
            id: 'statement-missing',
            artifactKey: 'statement-missing',
            accountKey: 'account',
            accountLabel: 'Account',
            sourceKind: 'BANK',
            period: '2024-10',
            status: 'IMPORTED',
            originalFileName: 'statement.pdf',
            statementControls: null,
            rowCount: null,
          },
        ],
        false,
      ),
    ).toEqual({ kind: 'unavailable' });
  });

  it('distinguishes permission denial from a general failure', () => {
    expect(workspaceReadFailure(new Error('403 Forbidden'))).toBe('denied');
    expect(workspaceReadFailure(new Error('network unavailable'))).toBe(
      'failed',
    );
  });

  it('keeps the explicit synthetic adapter on the production data contract', () => {
    expect(SYNTHETIC_WORKSPACE_FINANCE_DATA.truncated).toBe(false);
    expect(SYNTHETIC_WORKSPACE_FINANCE_DATA.accounts).toHaveLength(2);
    expect(
      SYNTHETIC_WORKSPACE_FINANCE_DATA.facts.map((fact) => fact.date),
    ).toEqual(expect.arrayContaining(['2024-11-29', '2026-03-02']));
    expect(
      SYNTHETIC_WORKSPACE_FINANCE_DATA.facts.every(
        (fact) =>
          fact.direction === 'in' ||
          fact.direction === 'out' ||
          fact.direction === 'unknown',
      ),
    ).toBe(true);
    expect(Object.isFrozen(SYNTHETIC_WORKSPACE_FINANCE_DATA.facts)).toBe(true);
  });
});
