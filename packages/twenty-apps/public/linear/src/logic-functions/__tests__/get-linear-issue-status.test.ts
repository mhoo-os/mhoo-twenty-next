import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getLinearIssueStatusHandler } from '../handlers/get-linear-issue-status-handler';
import { buildConnection, stubConnectionsThenLinear } from './test-utils';

const SAVED_ENV = { ...process.env };
const issue = {
  identifier: 'ENG-123',
  title: 'Fix login',
  state: { id: 'state-1', name: 'In Progress' },
  assignee: { id: 'user-1', name: 'Sam' },
  url: 'https://linear.app/example/issue/ENG-123/fix-login',
};
const input = { identifier: 'ENG-123' };

describe('getLinearIssueStatusHandler', () => {
  beforeEach(() => {
    process.env.TWENTY_API_URL = 'http://api.test';
    process.env.TWENTY_APP_ACCESS_TOKEN = 'app-token';
  });
  afterEach(() => {
    process.env = { ...SAVED_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('makes one fixed query and returns only requested provider fields', async () => {
    const fetchMock = stubConnectionsThenLinear([buildConnection()], {
      data: {
        issue: { ...issue, description: 'must not escape', secret: 'hidden' },
      },
    });
    expect(await getLinearIssueStatusHandler(input)).toEqual({
      success: true,
      issue: {
        identifier: issue.identifier,
        title: issue.title,
        status: issue.state,
        assignee: issue.assignee,
        sourceUrl: issue.url,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, request] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api.linear.app/graphql');
    expect(JSON.parse(request.body).variables).toEqual(input);
    expect(JSON.parse(request.body).query).toContain('issue(id: $identifier)');
    expect(JSON.parse(request.body).query).not.toMatch(
      /mutation|description|email/,
    );
    expect(request).toMatchObject({
      method: 'POST',
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({
      filter: { providerName: 'linear' },
    });
  });

  it('preserves unassigned as null', async () => {
    stubConnectionsThenLinear([buildConnection()], {
      data: { issue: { ...issue, assignee: null } },
    });
    expect(await getLinearIssueStatusHandler(input)).toMatchObject({
      success: true,
      issue: { assignee: null },
    });
  });

  it.each([
    null,
    {},
    [],
    { identifier: '' },
    { identifier: 'https://linear.app/a/issue/ENG-123' },
    { identifier: 'ENG-123\n' },
    { identifier: 'ENG-0' },
    { identifier: 'ENG-123', connectionId: 'another' },
    { identifier: 'A'.repeat(65) + '-1' },
  ])('rejects invalid input before any request: %j', async (value) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await getLinearIssueStatusHandler(value)).toMatchObject({
      success: false,
      code: 'INVALID_INPUT',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [[], 'NOT_CONNECTED'],
    [[buildConnection({ authFailedAt: '2026-01-01' })], 'DISCONNECTED'],
    [[buildConnection({ accessToken: '' })], 'DISCONNECTED'],
  ])(
    'stops before provider access for unavailable connections',
    async (connections, code) => {
      const fetchMock = stubConnectionsThenLinear(
        connections as ReturnType<typeof buildConnection>[],
        {},
      );
      expect(await getLinearIssueStatusHandler(input)).toMatchObject({
        success: false,
        code,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('does not switch accounts after a selected workspace connection fails', async () => {
    const fetchMock = stubConnectionsThenLinear(
      [
        buildConnection(),
        buildConnection({ visibility: 'workspace', authFailedAt: 'failed' }),
      ],
      {},
    );
    expect(await getLinearIssueStatusHandler(input)).toMatchObject({
      code: 'DISCONNECTED',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('contains a metadata permission failure without leaking its response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('private metadata token')),
    );
    const result = await getLinearIssueStatusHandler(input);
    expect(result).toMatchObject({ code: 'CONNECTION_UNAVAILABLE' });
    expect(JSON.stringify(result)).not.toContain('private metadata token');
  });

  it.each(['FORBIDDEN', 'ENTITY_NOT_FOUND', 'RATELIMITED', 'UNAUTHENTICATED'])(
    'classifies provider code %s even with partial data',
    async (code) => {
      stubConnectionsThenLinear([buildConnection()], {
        data: { issue },
        errors: [{ message: 'private provider details', extensions: { code } }],
      });
      const result = await getLinearIssueStatusHandler(input);
      expect(result).toMatchObject({
        success: false,
        code:
          code === 'ENTITY_NOT_FOUND'
            ? 'NOT_FOUND'
            : code === 'RATELIMITED'
              ? 'PROVIDER_FAILURE'
              : code === 'UNAUTHENTICATED'
                ? 'DISCONNECTED'
                : code,
      });
      expect(JSON.stringify(result)).not.toContain('private provider details');
    },
  );

  it.each([401, 403, 429, 500])(
    'classifies HTTP %s without a fallback request',
    async (status) => {
      const fetchMock = stubConnectionsThenLinear([buildConnection()], {});
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { appConnections: [buildConnection()] } }),
        text: async () => '',
      });
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => ({}),
        text: async () => 'sensitive failure',
      });
      expect(await getLinearIssueStatusHandler(input)).toMatchObject({
        success: false,
        code:
          status === 401
            ? 'DISCONNECTED'
            : status === 403
              ? 'FORBIDDEN'
              : 'PROVIDER_FAILURE',
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    { data: { issue: null } },
    {},
    null,
    { data: { issue: { ...issue, assignee: undefined } } },
    { data: { issue: { ...issue, state: null } } },
    { data: { issue: { ...issue, url: 'https://evil.example/a' } } },
    { errors: [null] },
  ])('handles missing or malformed data: %j', async (payload) => {
    stubConnectionsThenLinear([buildConnection()], payload);
    expect(await getLinearIssueStatusHandler(input)).toMatchObject({
      success: false,
      code: payload?.data?.issue === null ? 'NOT_FOUND' : 'PROVIDER_FAILURE',
    });
  });

  it('handles network timeout without retry or leaking details', async () => {
    const fetchMock = stubConnectionsThenLinear([buildConnection()], {});
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { appConnections: [buildConnection()] } }),
      text: async () => '',
    });
    fetchMock.mockRejectedValueOnce(new Error('private timeout'));
    expect(await getLinearIssueStatusHandler(input)).toMatchObject({
      code: 'PROVIDER_FAILURE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
