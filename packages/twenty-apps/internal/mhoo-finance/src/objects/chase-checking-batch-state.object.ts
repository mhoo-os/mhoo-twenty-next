import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  CHASE_CHECKING_BATCH_STATE_BATCH_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_CHECKING_BATCH_STATE_OBJECT_UNIVERSAL_IDENTIFIER,
  CHASE_CHECKING_BATCH_STATE_PAYLOAD_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_CHECKING_BATCH_STATE_REVISION_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/chase-checking-batch-state-identifiers';

export default defineObject({
  universalIdentifier: CHASE_CHECKING_BATCH_STATE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'chaseCheckingBatchState',
  namePlural: 'chaseCheckingBatchStates',
  labelSingular: 'Chase checking batch state',
  labelPlural: 'Chase checking batch states',
  description:
    'Application-owned serialized state for restart-safe Hass Chase checking imports.',
  icon: 'IconTransferIn',
  labelIdentifierFieldMetadataUniversalIdentifier:
    CHASE_CHECKING_BATCH_STATE_BATCH_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: CHASE_CHECKING_BATCH_STATE_BATCH_KEY_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'batchKey',
      label: 'Batch key',
      icon: 'IconKey',
    },
    {
      universalIdentifier: CHASE_CHECKING_BATCH_STATE_REVISION_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'revision',
      label: 'Revision',
      description: 'Monotonic compare-and-set revision for one batch writer.',
      icon: 'IconVersions',
    },
    {
      universalIdentifier: CHASE_CHECKING_BATCH_STATE_PAYLOAD_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'serializedState',
      label: 'Serialized state',
      description: 'Validated batch state JSON; never treated as caller-supplied events.',
      icon: 'IconCode',
    },
  ],
});
