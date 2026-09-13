import { defineLogicFunction } from 'twenty-sdk/define';

import { GET_LINEAR_ISSUE_STATUS_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getLinearIssueStatusHandler } from 'src/logic-functions/handlers/get-linear-issue-status-handler';

export default defineLogicFunction({
  universalIdentifier: GET_LINEAR_ISSUE_STATUS_UNIVERSAL_IDENTIFIER,
  name: 'get-linear-issue-status',
  description:
    'Read one Linear issue by explicit identifier using the current authorized connection. Returns identifier, title, status, assignee and source URL; never searches or writes issues.',
  timeoutSeconds: 15,
  handler: getLinearIssueStatusHandler,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['identifier'],
      properties: {
        identifier: {
          type: 'string',
          description: 'An explicit Linear issue identifier, such as ENG-123.',
        },
      },
    },
  },
});
