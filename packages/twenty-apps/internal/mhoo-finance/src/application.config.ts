import { defineApplication } from 'twenty-sdk/define';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Mhoo Finance',
  description:
    'Synthetic, read-only finance coverage, reconciliation, and source-lineage fixtures for a governed Twenty Workspace.',
});
