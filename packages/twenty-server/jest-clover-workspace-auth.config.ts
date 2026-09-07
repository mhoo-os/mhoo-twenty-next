import base from './jest-integration.config';

// Preserve the suite's exact 55441 synthetic database guard and native setup.
export default {
  ...base,
  testRegex: 'same-origin-workspaces\\.integration-spec\\.ts$',
  testPathIgnorePatterns: base.testPathIgnorePatterns?.filter(
    (path) => !path.endsWith('/same-origin-workspaces.integration-spec.ts'),
  ),
};
