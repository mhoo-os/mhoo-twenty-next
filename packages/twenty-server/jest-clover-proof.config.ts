import base from './jest-integration.config';

// Preserve the standard engine setup while selecting only the resource-bound
// Clover proof. The suite itself rejects every non-dedicated database.
export default {
  ...base,
  testRegex: 'clover-native-data\\.integration-spec\\.ts$',
  testPathIgnorePatterns: base.testPathIgnorePatterns?.filter(
    (path) => !path.endsWith('/clover-native-data.integration-spec.ts'),
  ),
};
