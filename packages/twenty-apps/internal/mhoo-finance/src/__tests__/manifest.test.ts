import { describe, expect, it } from 'vitest';

import application from 'src/application.config';
import financeFixtureReaderRole from 'src/roles/finance-fixture-reader.role';

describe('@mhoo/finance fixture manifest contracts', () => {
  it('declares no secret App variables', () => {
    expect(application.success).toBe(true);
    expect(application.config?.serverVariables).toBeUndefined();
  });

  it('preserves the fixture reader with zero Twenty authority', () => {
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
      objectPermissions: [],
      fieldPermissions: [],
      permissionFlagUniversalIdentifiers: [],
    });
  });
});
