import { describe, expect, it } from 'vitest';

import manualProvider from 'src/connection-providers/clover-manual.connection-provider';
import cloverReaderRole from 'src/roles/clover-reader.role';
import merchantRead from 'src/logic-functions/clover-merchant-read.logic-function';
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

it('binds the manual provider and least-privilege App ceiling without public triggers', () => {
  expect(manualProvider.success).toBe(true);
  expect(manualProvider.config?.type).toBe('manualToken');
  expect(cloverReaderRole.success).toBe(true);
  expect(application.config?.defaultRoleUniversalIdentifier).toBe(
    cloverReaderRole.config?.universalIdentifier,
  );
  expect(cloverReaderRole.config?.canAccessAllTools).toBe(false);
  expect(merchantRead.success).toBe(true);
  expect(merchantRead.config?.httpRouteTriggerSettings).toBeUndefined();
  expect(merchantRead.config?.toolTriggerSettings).toBeUndefined();
  expect(merchantRead.config?.cronTriggerSettings).toBeUndefined();
});
