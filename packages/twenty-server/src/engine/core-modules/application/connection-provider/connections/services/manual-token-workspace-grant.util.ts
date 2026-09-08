import { isUUID } from 'class-validator';
import { type ManualTokenWorkspaceGrant } from 'src/engine/core-modules/application/connection-provider/connections/types/manual-token-workspace-grant.type';

// Validate persisted metadata before using it as authority. A non-null JSON value
// or a caller-selected grant ID is not evidence of a valid native grant.
export const parseActiveManualTokenWorkspaceGrant = (
  value: unknown,
  now = Date.now(),
): ManualTokenWorkspaceGrant | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const grant = value as Record<string, unknown>;
  if (
    Object.keys(grant).sort().join(',') !==
      'capability,grantedAt,grantedByUserWorkspaceId,id,revokedAt,version' ||
    grant.version !== 1 ||
    grant.capability !== 'provider-readonly-sync' ||
    typeof grant.id !== 'string' ||
    !isUUID(grant.id, '4') ||
    typeof grant.grantedByUserWorkspaceId !== 'string' ||
    !isUUID(grant.grantedByUserWorkspaceId, '4') ||
    typeof grant.grantedAt !== 'string' ||
    !Number.isFinite(Date.parse(grant.grantedAt)) ||
    new Date(grant.grantedAt).toISOString() !== grant.grantedAt ||
    Date.parse(grant.grantedAt) > now ||
    grant.revokedAt !== null
  )
    return null;
  return grant as ManualTokenWorkspaceGrant;
};
