import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  FINANCE_FIXTURE_READER_ROLE_UNIVERSAL_IDENTIFIER,
  FINANCE_EVIDENCE_LINK_DECISION_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCIAL_ACCOUNT_OBJECT_UNIVERSAL_IDENTIFIER,
  SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplicationRole({
  universalIdentifier: FINANCE_FIXTURE_READER_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Mhoo Finance reviewer',
  description:
    'Read Finance records and review native Tasks and immutable evidence decisions. No deletion, settings, provider access or publishing.',
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
    ...[
      FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
      FINANCIAL_ACCOUNT_OBJECT_UNIVERSAL_IDENTIFIER,
      SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
    ].map((objectUniversalIdentifier) => ({
      objectUniversalIdentifier,
      canReadObjectRecords: true,
      canUpdateObjectRecords: false,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    })),
    {
      objectUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    },
    {
      objectUniversalIdentifier:
        FINANCE_EVIDENCE_LINK_DECISION_OBJECT_UNIVERSAL_IDENTIFIER,
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    },
  ],
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [],
});
