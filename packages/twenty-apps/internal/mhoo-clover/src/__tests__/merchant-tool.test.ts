import { expect, it } from 'vitest';
import merchantRead from '../logic-functions/clover-merchant-read.logic-function';
import cloverReaderRole from '../roles/clover-reader.role';

it('exposes only the bounded merchant identity read to agents', () => {
  expect(cloverReaderRole.success).toBe(true);
  expect(cloverReaderRole.config).toMatchObject({
    canAccessAllTools: true,
    canBeAssignedToAgents: true,
  });
  expect(merchantRead.success).toBe(true);
  expect(merchantRead.config).toMatchObject({
    name: 'clover-merchant-read',
    toolTriggerSettings: {
      inputSchema: {
        type: 'object',
        properties: { connectionId: { type: 'string' } },
        additionalProperties: false,
      },
    },
  });
  expect(merchantRead.config?.httpRouteTriggerSettings).toBeUndefined();
  expect(merchantRead.config?.cronTriggerSettings).toBeUndefined();
});
