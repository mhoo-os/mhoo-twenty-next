import { describe, expect, it } from 'vitest';

import application from 'src/application.config';
import {
  COVERAGE_PERIOD_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
  FINANCE_REVIEWER_ROLE_UNIVERSAL_IDENTIFIER,
  IMPORT_RECEIPT_OBJECT_UNIVERSAL_IDENTIFIER,
  RECONCILIATION_EXCEPTION_OBJECT_UNIVERSAL_IDENTIFIER,
  SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import financeReviewerRole from 'src/roles/finance-reviewer.role';

describe('@mhoo/finance manifest contracts', () => {
  it('declares a provider-free synthetic application', () => {
    expect(application.success).toBe(true);
    expect(application.config).toMatchObject({
      universalIdentifier: 'ad100496-8c49-4453-9814-886ac4064d4c',
      displayName: 'Mhoo Finance',
    });
    expect(application.config).not.toHaveProperty('serverVariables');
  });

  it('uses one assignable role with read-only authority over only Finance objects', () => {
    expect(financeReviewerRole.success).toBe(true);
    expect(financeReviewerRole.config).toMatchObject({
      universalIdentifier: FINANCE_REVIEWER_ROLE_UNIVERSAL_IDENTIFIER,
      canAccessAllTools: false,
      canReadAllObjectRecords: false,
      canUpdateAllObjectRecords: false,
      canSoftDeleteAllObjectRecords: false,
      canDestroyAllObjectRecords: false,
      canUpdateAllSettings: false,
      objectPermissions: [
        expect.objectContaining({
          objectUniversalIdentifier:
            SOURCE_ARTIFACT_OBJECT_UNIVERSAL_IDENTIFIER,
          canReadObjectRecords: true,
          canUpdateObjectRecords: false,
          canSoftDeleteObjectRecords: false,
          canDestroyObjectRecords: false,
        }),
        expect.objectContaining({
          objectUniversalIdentifier:
            IMPORT_RECEIPT_OBJECT_UNIVERSAL_IDENTIFIER,
        }),
        expect.objectContaining({
          objectUniversalIdentifier:
            FINANCE_FACT_OBJECT_UNIVERSAL_IDENTIFIER,
        }),
        expect.objectContaining({
          objectUniversalIdentifier:
            COVERAGE_PERIOD_OBJECT_UNIVERSAL_IDENTIFIER,
        }),
        expect.objectContaining({
          objectUniversalIdentifier:
            RECONCILIATION_EXCEPTION_OBJECT_UNIVERSAL_IDENTIFIER,
        }),
      ],
      fieldPermissions: [],
      permissionFlagUniversalIdentifiers: [],
      canBeAssignedToAgents: false,
      canBeAssignedToUsers: true,
      canBeAssignedToApiKeys: false,
    });
  });

  it('does not declare provider, route, or execution surfaces', () => {
    expect(financeReviewerRole.config).not.toHaveProperty(
      'toolTriggerSettings',
    );
    expect(financeReviewerRole.config).not.toHaveProperty(
      'httpRouteTriggerSettings',
    );
  });
});
