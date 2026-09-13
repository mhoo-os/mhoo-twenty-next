import { defineIndex } from 'twenty-sdk/define';
import {
  IMPORT_RECEIPT_OBJECT,
  IMPORT_RECEIPT_KEY_FIELD,
} from '../contracts/model-identifiers';
export default defineIndex({
  universalIdentifier: '405168e5-8954-4e02-8dc0-a4432c939453',
  objectUniversalIdentifier: IMPORT_RECEIPT_OBJECT,
  isUnique: true,
  fields: [
    {
      universalIdentifier: '8617d6c2-7f7a-47eb-af34-45fbc3087b13',
      fieldUniversalIdentifier: IMPORT_RECEIPT_KEY_FIELD,
    },
  ],
});
