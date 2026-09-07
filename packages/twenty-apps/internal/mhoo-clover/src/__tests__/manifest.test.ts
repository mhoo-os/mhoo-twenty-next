import { expect, it } from 'vitest';
import application from '../application.config';
import manualProvider from '../connection-providers/clover-manual.connection-provider';
import cloverReaderRole from '../roles/clover-reader.role';
import merchantRead from '../logic-functions/clover-merchant-read.logic-function';

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
