// Secret-free phase-one provider data; not financial transactions or verified scopes.
export const CLOVER_MERCHANT_OBSERVATION_OBJECT =
  '27e1bebd-b3f0-462a-acf5-352879f11c5d';
export type CloverMerchantObservation = {
  connectedAccountId: string;
  merchantId: string;
  merchantName: string;
  observedAt: string;
  sourceRevision: 'merchant-v1';
  sourcePath: string;
  scopeVerification: 'unknown';
};
