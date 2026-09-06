import { defineApplicationRole } from 'twenty-sdk/define';

import {
  FINANCE_FIXTURE_READER_ROLE_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCIAL_ACCOUNT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: FINANCE_FIXTURE_READER_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Mhoo Finance reader',
  description:
    'Read Finance facts and account labels for the signed-in user. No writes, settings, provider access or publishing.',
  canAccessAllTools: false,
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: true,
  canBeAssignedToApiKeys: false,
  objectPermissions: [
    FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
    FINANCIAL_ACCOUNT_OBJECT_UNIVERSAL_IDENTIFIER,
  ].map((objectUniversalIdentifier) => ({
    objectUniversalIdentifier,
    canReadObjectRecords: true,
    canUpdateObjectRecords: false,
    canSoftDeleteObjectRecords: false,
    canDestroyObjectRecords: false,
  })),
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [],
});
