import { defineIndex } from 'twenty-sdk/define';
import {
  CONNECTION_OBJECT,
  CONNECTION_KEY_FIELD,
} from '../contracts/model-identifiers';
export default defineIndex({
  universalIdentifier: 'd5b11bd1-f0d4-4ca9-8433-a67a3f9d332f',
  objectUniversalIdentifier: CONNECTION_OBJECT,
  isUnique: true,
  fields: [
    {
      universalIdentifier: 'de988075-e3b0-4dc0-93f2-cff05910de56',
      fieldUniversalIdentifier: CONNECTION_KEY_FIELD,
    },
  ],
});
