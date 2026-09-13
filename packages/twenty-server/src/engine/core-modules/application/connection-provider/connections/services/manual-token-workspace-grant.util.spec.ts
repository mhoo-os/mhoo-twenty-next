import { randomUUID } from 'crypto';
import { parseActiveManualTokenWorkspaceGrant } from './manual-token-workspace-grant.util';
const grant = {
  version: 1,
  id: randomUUID(),
  capability: 'provider-readonly-sync',
  grantedByUserWorkspaceId: randomUUID(),
  grantedAt: '2026-09-07T00:00:00.000Z',
  revokedAt: null,
};
describe('native explicit manual Workspace grant', () => {
  it('accepts only the exact active contract', () => {
    expect(
      parseActiveManualTokenWorkspaceGrant(grant, Date.parse(grant.grantedAt)),
    ).toEqual(grant);
  });
  it.each([
    null,
    {},
    true,
    [],
    'enabled',
    { ...grant, revokedAt: grant.grantedAt },
    { ...grant, capability: 'write' },
    { ...grant, version: 2 },
    { ...grant, id: 'job-argument' },
    { ...grant, grantedAt: 'invalid' },
    { ...grant, grantedAt: '0' },
    { ...grant, grantedByUserWorkspaceId: '' },
    { ...grant, extra: true },
  ])('denies malformed or revoked grant %#', (value) => {
    expect(parseActiveManualTokenWorkspaceGrant(value)).toBeNull();
  });
  it('denies future-dated activation', () => {
    expect(
      parseActiveManualTokenWorkspaceGrant(
        grant,
        Date.parse(grant.grantedAt) - 1,
      ),
    ).toBeNull();
  });
});
