// Native custody metadata, never copied from an App record or a job payload.
export type ManualTokenWorkspaceGrant = {
  version: 1;
  id: string;
  capability: 'provider-readonly-sync';
  grantedByUserWorkspaceId: string;
  grantedAt: string;
  revokedAt: string | null;
};
