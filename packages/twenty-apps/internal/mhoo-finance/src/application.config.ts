import { defineApplication } from 'twenty-sdk/define';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Mhoo Finance',
  defaultRoleUniversalIdentifier: '18a77bfe-8417-46ad-8f48-69bd56010c78',
  description:
    'Synthetic-only, fixture-first finance evidence, coverage, and reconciliation review.',
});
