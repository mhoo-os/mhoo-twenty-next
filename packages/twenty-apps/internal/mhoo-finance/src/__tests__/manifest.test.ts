import { describe, expect, it } from 'vitest';

import {
  FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCIAL_ACCOUNT_OBJECT_UNIVERSAL_IDENTIFIER,
  SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import application from 'src/application.config';
import financeFixtureReaderRole from 'src/roles/finance-fixture-reader.role';

describe('@mhoo/finance fixture manifest contracts', () => {
  it('declares no provider variables or credential boundary', () => {
    expect(application.success).toBe(true);
    expect(application.config?.serverVariables).toBeUndefined();
  });

  it('grants only Finance facts, accounts and source evidence read access, without mutation authority', () => {
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
      fieldPermissions: [],
      permissionFlagUniversalIdentifiers: [],
    });
  });
});
