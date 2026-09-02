import { defineApplicationRole } from 'twenty-sdk/define';

import {
  COVERAGE_PERIOD_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCE_REVIEWER_ROLE_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_OBJECT_UNIVERSAL_IDENTIFIER,
  RECONCILIATION_EXCEPTION_OBJECT_UNIVERSAL_IDENTIFIER,
  SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

const readOnlyObjectRecords = {
  canReadObjectRecords: true,
  canUpdateObjectRecords: false,
  canSoftDeleteObjectRecords: false,
  canDestroyObjectRecords: false,
};

export default defineApplicationRole({
  universalIdentifier: FINANCE_REVIEWER_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Finance reviewer',
  description:
    'Reads synthetic finance audit records without write, settings, tool, or provider authority.',
  icon: 'IconReportMoney',
  canAccessAllTools: false,
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [],
  objectPermissions: [
    {
      objectUniversalIdentifier:
        SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readOnlyObjectRecords,
    },
    {
      objectUniversalIdentifier:
        IMPORT_RECEIPT_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readOnlyObjectRecords,
    },
    {
      objectUniversalIdentifier: FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readOnlyObjectRecords,
    },
    {
      objectUniversalIdentifier:
        COVERAGE_PERIOD_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readOnlyObjectRecords,
    },
    {
      objectUniversalIdentifier:
        RECONCILIATION_EXCEPTION_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readOnlyObjectRecords,
    },
  ],
});
