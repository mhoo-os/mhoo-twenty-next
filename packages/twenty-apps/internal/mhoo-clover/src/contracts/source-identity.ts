import { createHash } from 'node:crypto';
// Input must already be resolved through native authorization. Hashes grant no access.
export const cloverSourceKey = (
  connectionId: string,
  objectKind: string,
  providerId: string,
  parentId: string | null = null,
) => {
  if (
    [connectionId, objectKind, providerId].some(
      (v) => typeof v !== 'string' || !v || v.length > 200,
    )
  )
    throw new Error('Invalid source identity');
  if (
    parentId !== null &&
    (typeof parentId !== 'string' || !parentId || parentId.length > 200)
  )
    throw new Error('Invalid parent identity');
  return createHash('sha256')
    .update(
      JSON.stringify([
        'clover-source-v1',
        connectionId,
        objectKind,
        parentId,
        providerId,
      ]),
    )
    .digest('hex');
};
