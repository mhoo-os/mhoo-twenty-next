import { defineApplicationRole } from 'twenty-sdk/define';

export default defineApplicationRole({
  universalIdentifier: '18a77bfe-8417-46ad-8f48-69bd56010c78',
  label: 'Finance connection reader',
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
  permissionFlagUniversalIdentifiers: ['e5f63b2d-5369-5df6-8f32-a8bd9e79e653'],
});
