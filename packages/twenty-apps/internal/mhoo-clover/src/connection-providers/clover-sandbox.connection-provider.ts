import { defineConnectionProvider } from 'twenty-sdk/define';

// Retained for compatibility with existing Clover App installations. New
// operator flows use the production provider and do not select this entry.
export default defineConnectionProvider({
  universalIdentifier: 'd3d798ca-d19c-4ae5-97db-b3e112829e5c',
  name: 'clover-manual-sandbox',
  displayName: 'Clover sandbox test token',
  type: 'manualToken',
});
