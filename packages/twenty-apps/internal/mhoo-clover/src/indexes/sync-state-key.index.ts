import { defineIndex } from 'twenty-sdk/define';
import {
  SYNC_STATE_OBJECT,
  SYNC_KEY_FIELD,
} from '../contracts/model-identifiers';
export default defineIndex({
  universalIdentifier: '8def6040-d2d7-48b6-b663-3ec89b9d8017',
  objectUniversalIdentifier: SYNC_STATE_OBJECT,
  isUnique: true,
  fields: [
    {
      universalIdentifier: 'b03dce79-353f-4e56-9a2d-964c925648a9',
      fieldUniversalIdentifier: SYNC_KEY_FIELD,
    },
  ],
});
