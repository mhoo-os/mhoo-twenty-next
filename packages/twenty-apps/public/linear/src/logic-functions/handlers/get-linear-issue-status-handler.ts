import { listConnections } from 'twenty-sdk/logic-function';

import { callLinearGraphQL } from 'src/logic-functions/utils/call-linear-graphql';

export type IssueStatusResult =
  | {
      success: true;
      issue: {
        identifier: string;
        title: string;
        status: { id: string; name: string };
        assignee: { id: string; name: string } | null;
        sourceUrl: string;
      };
    }
  | {
      success: false;
      code:
        | 'INVALID_INPUT'
        | 'NOT_CONNECTED'
        | 'DISCONNECTED'
        | 'CONNECTION_UNAVAILABLE'
        | 'NOT_FOUND'
        | 'FORBIDDEN'
        | 'PROVIDER_FAILURE';
      error: string;
    };

const failure = (
  code: Extract<IssueStatusResult, { success: false }>['code'],
  error: string,
): IssueStatusResult => ({ success: false, code, error });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNamed = (value: unknown): value is { id: string; name: string } =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  typeof value.name === 'string' &&
  value.name.length > 0;

// One explicit identifier, never a search, URL, caller-selected connection or
// Workspace selector. Twenty filters Connections for the authenticated App/user.
export const getLinearIssueStatusHandler = async (
  input: unknown,
): Promise<IssueStatusResult> => {
  if (
    !isRecord(input) ||
    Object.keys(input).some((key) => key !== 'identifier') ||
    typeof input.identifier !== 'string' ||
    input.identifier.length > 64 ||
    !/^[A-Za-z][A-Za-z0-9]*-[1-9][0-9]*$/.test(input.identifier)
  ) {
    return failure(
      'INVALID_INPUT',
      'Provide one issue identifier, such as ENG-123.',
    );
  }

  let connections: Awaited<ReturnType<typeof listConnections>>;
  try {
    connections = await listConnections({ providerName: 'linear' });
  } catch {
    // The SDK flattens metadata failures into Error strings. Do not infer a
    // permission verdict or disclose those strings to a tool consumer.
    return failure(
      'CONNECTION_UNAVAILABLE',
      'The current App cannot access its Linear connections.',
    );
  }

  // Preserve the existing App selection rule. Never retry through another
  // account after a disconnected or denied result.
  const connection =
    connections.find((candidate) => candidate.visibility === 'workspace') ??
    connections[0];
  if (!connection) {
    return failure(
      'NOT_CONNECTED',
      'No Linear connection is available to this App.',
    );
  }
  if (connection.authFailedAt || !connection.accessToken) {
    return failure(
      'DISCONNECTED',
      'The selected Linear connection needs to be reconnected.',
    );
  }

  const result = await callLinearGraphQL<{ issue: unknown }>({
    accessToken: connection.accessToken,
    signal: AbortSignal.timeout(10_000),
    query: `query IssueStatus($identifier: String!) {
      issue(id: $identifier) {
        identifier title url state { id name } assignee { id name }
      }
    }`,
    variables: { identifier: input.identifier },
  });

  if (
    !isRecord(result) ||
    (result.errors !== undefined &&
      (!Array.isArray(result.errors) ||
        result.errors.some((error) => !isRecord(error))))
  ) {
    return failure('PROVIDER_FAILURE', 'Linear returned an invalid response.');
  }

  const codes =
    result.errors?.flatMap((error) => [
      error.extensions?.code,
      error.extensions?.type,
    ]) ?? [];
  if (
    result.httpStatus === 401 ||
    codes.includes('UNAUTHENTICATED') ||
    codes.includes('AUTHENTICATION_ERROR')
  ) {
    return failure(
      'DISCONNECTED',
      'Linear rejected the connection authentication.',
    );
  }
  if (result.httpStatus === 403 || codes.includes('FORBIDDEN')) {
    return failure('FORBIDDEN', 'Linear denied access to this issue.');
  }
  if (result.errors?.length || result.httpStatus) {
    if (codes.includes('ENTITY_NOT_FOUND') || codes.includes('NOT_FOUND')) {
      return failure('NOT_FOUND', 'Linear did not return the requested issue.');
    }
    return failure(
      'PROVIDER_FAILURE',
      'Linear could not complete the issue lookup.',
    );
  }
  if (result.data?.issue === null) {
    return failure('NOT_FOUND', 'Linear did not return the requested issue.');
  }

  const issue = result.data?.issue;
  if (
    !isRecord(issue) ||
    typeof issue.identifier !== 'string' ||
    !/^[A-Za-z][A-Za-z0-9]*-[1-9][0-9]*$/.test(issue.identifier) ||
    typeof issue.title !== 'string' ||
    !isNamed(issue.state) ||
    !(issue.assignee === null || isNamed(issue.assignee)) ||
    typeof issue.url !== 'string'
  ) {
    return failure(
      'PROVIDER_FAILURE',
      'Linear returned an incomplete issue response.',
    );
  }
  // Keep the provider's canonical URL rather than constructing one from input.
  try {
    const url = new URL(issue.url);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'linear.app' ||
      url.username ||
      url.password ||
      url.port
    ) {
      return failure(
        'PROVIDER_FAILURE',
        'Linear returned an invalid source URL.',
      );
    }
  } catch {
    return failure(
      'PROVIDER_FAILURE',
      'Linear returned an invalid source URL.',
    );
  }

  return {
    success: true,
    issue: {
      identifier: issue.identifier,
      title: issue.title,
      status: { id: issue.state.id, name: issue.state.name },
      assignee:
        issue.assignee === null
          ? null
          : { id: issue.assignee.id, name: issue.assignee.name },
      sourceUrl: issue.url,
    },
  };
};
