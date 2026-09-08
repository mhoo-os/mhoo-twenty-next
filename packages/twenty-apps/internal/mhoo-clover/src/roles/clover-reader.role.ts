import {
  PAYMENT_REVISION_OBJECT,
  IMPORT_RECEIPT_OBJECT,
  CONNECTION_OBJECT,
  SYNC_STATE_OBJECT,
} from '../contracts/model-identifiers';

import { defineApplicationRole } from 'twenty-sdk/define';

export default defineApplicationRole({
  universalIdentifier: '18a77bfe-8417-46ad-8f48-69bd56010c78',
  label: 'Clover connection reader',
  description:
    'Native connection permission ceiling; caller permissions also apply. No provider write or public trigger.',
  canAccessAllTools: false,
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: [
    ...[
      CONNECTION_OBJECT,
      SYNC_STATE_OBJECT,
      PAYMENT_REVISION_OBJECT,
      IMPORT_RECEIPT_OBJECT,
    ].map((objectUniversalIdentifier) => ({
      objectUniversalIdentifier,
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    })),
    {
      objectUniversalIdentifier: '27e1bebd-b3f0-462a-acf5-352879f11c5d',
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    },
  ],
  permissionFlagUniversalIdentifiers: ['e5f63b2d-5369-5df6-8f32-a8bd9e79e653'],
});
