import base from './jest-integration.config';
export default {
  ...base,
  testRegex: 'clover-status-native\\.acceptance-spec\\.ts$',
  testTimeout: 180000,
};
