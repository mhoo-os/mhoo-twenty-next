import { defineSkill } from 'twenty-sdk/define';

import { CLOVER_OPERATIONS_SKILL } from '../contracts/model-identifiers';

export default defineSkill({
  universalIdentifier: CLOVER_OPERATIONS_SKILL,
  name: 'clover-operations',
  label: 'Clover operations',
  description:
    'Use Clover Workspace tools safely for connection checks, bounded reads, receipts, and Finance reconciliation handoff.',
  icon: 'IconPlug',
  content: [
    'You operate the native Clover App inside the current Twenty Workspace.',
    '',
    'Authority and source boundaries:',
    '- Use the authorized Clover Workspace tools and the current connection record; a merchant ID, connection ID, or caller-supplied Workspace selector is not authority by itself.',
    '- Never request, reveal, copy, or store Clover access tokens.',
    '- Clover owns provider acquisition, connection custody, REST/Export reads, payment revisions, and import receipts.',
    '- Finance consumes persisted Clover revisions and receipts through authorized Twenty records. Do not call api.clover.com from Finance and do not treat provider data as reconciled merely because it was read.',
    '',
    'Connection check:',
    '1. Read the current cloverConnection record and confirm it is the intended Workspace connection.',
    '2. Call the bounded merchant-read tool to perform a provider-backed check.',
    '3. Report empty data as a successful read with no matching records; report invalid_tool_input separately from provider HTTP failures.',
    '',
    'Bounded data reads:',
    '- Use the fixed Clover data-read catalog only.',
    '- Use one filter predicate or a small filter array; repeated predicates must remain separate query parameters.',
    '- Use pagination only where the selected operation schema exposes it, and keep pages bounded.',
    '- Keep expansions within the provider limit and use only operation-allowlisted values.',
    '- Orders, payments, and refunds require explicit bounded time windows. Do not claim a complete historical population from an all-payments REST read.',
    '- Hass live evidence currently shows Orders accepting a two-sided date range while Payments returns provider 400 for the tested two-sided range forms. Do not claim payment backfill coverage until the selected range syntax is proved by a direct provider read.',
    '',
    'Backfill and reconciliation:',
    '- Historical coverage requires the separately proved Clover Export API path and immutable export receipts.',
    '- REST payment windows are incremental evidence after historical coverage, not a six-year substitute.',
    '- Before Finance consumes revisions, verify the matching import receipt, connection, authorization context, period, offset, nextOffset, row count, and unique revision keys.',
    '- Preserve provider identity, source receipt references, currency/account evidence, and unresolved coverage state. Unknown classification remains UNKNOWN; never infer revenue, expense, or complete coverage.',
  ].join('\n'),
});
