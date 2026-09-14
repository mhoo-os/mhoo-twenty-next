import { defineApplication } from 'twenty-sdk/define';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Mhoo Finance',
  description:
    'Review financial accounts, statement evidence, and normalized transaction records in your Workspace.',
  logo: 'public/logo.svg',
});
