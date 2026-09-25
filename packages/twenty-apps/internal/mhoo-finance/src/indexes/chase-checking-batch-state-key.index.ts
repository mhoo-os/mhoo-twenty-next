import { defineIndex } from 'twenty-sdk/define';

import {
  CHASE_CHECKING_BATCH_STATE_BATCH_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  CHASE_CHECKING_BATCH_STATE_KEY_INDEX_UNIVERSAL_IDENTIFIER,
  CHASE_CHECKING_BATCH_STATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/chase-checking-batch-state-identifiers';

export default defineIndex({
  universalIdentifier: CHASE_CHECKING_BATCH_STATE_KEY_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: CHASE_CHECKING_BATCH_STATE_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: 'f9e1d2f3-a4b5-4678-9012-3456789abd26',
      fieldUniversalIdentifier:
        CHASE_CHECKING_BATCH_STATE_BATCH_KEY_FIELD_UNIVERSAL_IDENTIFIER,
    },
  ],
});
