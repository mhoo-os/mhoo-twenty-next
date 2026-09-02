export type AuthorizationExpectation = 'ALLOW_READ' | 'DENY';

export type AuthorizationFixture = {
  caseKey: string;
  principal: string;
  workspace: string;
  operation: 'READ' | 'WRITE';
  expected: AuthorizationExpectation;
  reason: string;
};

// These are redacted decision vectors for tests and review. Twenty remains the
// authority for the actual Workspace, role, and row authorization decision.
export const AUTHORIZATION_FIXTURES: AuthorizationFixture[] = [
  {
    caseKey: 'reviewer-reads-fixture-workspace',
    principal: 'finance-reviewer',
    workspace: 'synthetic-workspace-a',
    operation: 'READ',
    expected: 'ALLOW_READ',
    reason: 'The assigned Finance reviewer can read the five native Finance objects.',
  },
  {
    caseKey: 'reviewer-cannot-write-fixture-workspace',
    principal: 'finance-reviewer',
    workspace: 'synthetic-workspace-a',
    operation: 'WRITE',
    expected: 'DENY',
    reason: 'The role has no create, update, soft-delete, or destroy authority.',
  },
  {
    caseKey: 'unassigned-user-cannot-read',
    principal: 'unassigned-user',
    workspace: 'synthetic-workspace-a',
    operation: 'READ',
    expected: 'DENY',
    reason: 'A user without the Finance reviewer role has no App object authority.',
  },
  {
    caseKey: 'reviewer-cannot-cross-workspace',
    principal: 'finance-reviewer',
    workspace: 'synthetic-workspace-b',
    operation: 'READ',
    expected: 'DENY',
    reason: 'Workspace membership and authorization remain Twenty-owned boundaries.',
  },
];
