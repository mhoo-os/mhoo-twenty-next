import { describe, expect, it } from 'vitest';
import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  FINANCE_EVIDENCE_LINK_DECISION_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCIAL_ACCOUNT_OBJECT_UNIVERSAL_IDENTIFIER,
  SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import application from 'src/application.config';
import financeFixtureReaderRole from 'src/roles/finance-fixture-reader.role';

describe('@mhoo/finance fixture manifest contracts', () => {
  it('declares no secret App variables', () => {
    expect(application.success).toBe(true);
    expect(application.config?.serverVariables).toBeUndefined();
  });

  it('grants bounded review access without deletion, settings, provider or agent authority', () => {
    expect(financeFixtureReaderRole.success).toBe(true);
    expect(financeFixtureReaderRole.config).toMatchObject({
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
  });
});
