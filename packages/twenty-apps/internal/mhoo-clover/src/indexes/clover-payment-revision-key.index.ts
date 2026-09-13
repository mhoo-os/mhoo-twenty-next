import { defineIndex } from 'twenty-sdk/define';
import {
  PAYMENT_REVISION_OBJECT,
  PAYMENT_REVISION_KEY_FIELD,
} from '../contracts/model-identifiers';
export default defineIndex({
  universalIdentifier: 'd48dfc0f-2497-4040-b156-0d6d29940fd1',
  objectUniversalIdentifier: PAYMENT_REVISION_OBJECT,
  isUnique: true,
  fields: [
    {
      universalIdentifier: '546d93f7-2701-4d1b-91a9-078ed4d1c03d',
      fieldUniversalIdentifier: PAYMENT_REVISION_KEY_FIELD,
    },
  ],
});
