import { defineApplicationRole } from 'twenty-sdk/define';

import { FINANCE_FIXTURE_READER_ROLE_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: FINANCE_FIXTURE_READER_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Mhoo Finance fixture reader',
  description:
    'May use the synthetic Finance fixture preview. It grants no record, settings, provider, or production authority.',
  canAccessAllTools: false,
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: true,
  canBeAssignedToApiKeys: false,
  objectPermissions: [],
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [],
});
