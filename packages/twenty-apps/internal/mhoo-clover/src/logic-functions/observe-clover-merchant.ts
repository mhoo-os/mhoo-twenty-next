import { type CloverMerchantObservation } from '../contracts/merchant-observation';
import { readCloverMerchant } from './clover-merchant-read';

// Internal dependency injection only; payloads cannot select a URL, identity or writer.
export const observeCloverMerchant = async (
  dependencies: Parameters<typeof readCloverMerchant>[0] & {
    save: (observation: CloverMerchantObservation) => Promise<unknown>;
    now: () => Date;
  },
) => {
  try {
    const merchant = await readCloverMerchant(dependencies);
    const observation: CloverMerchantObservation = {
      ...merchant,
      observedAt: dependencies.now().toISOString(),
      sourceRevision: 'merchant-v1',
      sourcePath: `/v3/merchants/${merchant.merchantId}?fields=id,name`,
    };
    await dependencies.save(observation);
    return observation;
  } catch {
    throw new Error(
      'Clover observation was not confirmed saved. Check the connection and Workspace permissions.',
    );
  }
};
