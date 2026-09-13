import { expect, it } from 'vitest';
import application from '../application.config';
import manualProvider from '../connection-providers/clover-manual.connection-provider';
import cloverReaderRole from '../roles/clover-reader.role';
import merchantRead from '../logic-functions/clover-merchant-read.logic-function';
import paymentImport from '../logic-functions/clover-payment-import.logic-function';
import history from '../logic-functions/clover-payment-history.logic-function';
import recovery from '../logic-functions/clover-payment-recover.logic-function';

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

it('keeps payment import private and rejects interactive invocation', async () => {
  expect(paymentImport.success).toBe(true);
  expect(paymentImport.config?.httpRouteTriggerSettings).toBeUndefined();
  expect(paymentImport.config?.toolTriggerSettings).toBeUndefined();
  expect(paymentImport.config?.cronTriggerSettings).toBeUndefined();
  await expect(
    paymentImport.config!.handler(
      {} as never,
      { userWorkspaceId: 'synthetic-user' } as never,
    ),
  ).rejects.toThrow('background execution');
});

it.each([history, recovery])(
  'keeps operator entry points explicit and unscheduled',
  async (entry) => {
    expect(entry.success).toBe(true);
    expect(entry.config?.httpRouteTriggerSettings).toBeUndefined();
    expect(entry.config?.toolTriggerSettings).toBeUndefined();
    expect(entry.config?.cronTriggerSettings).toBeUndefined();
    await expect(
      entry.config!.handler(
        {} as never,
        { userWorkspaceId: null, workspaceMemberId: null } as never,
      ),
    ).rejects.toThrow('Workspace member');
  },
);
