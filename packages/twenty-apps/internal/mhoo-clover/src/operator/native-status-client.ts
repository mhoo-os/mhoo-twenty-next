import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import { decodeStatus, type StatusResult } from './status-contract';
import { STATUS_ROUTE, decodeMerchantList, type MerchantListResult } from './status-route-contract';
const post = async (body: unknown, client: RestApiClient): Promise<unknown> => {
  try { return await client.post(`/s${STATUS_ROUTE}`, body); }
  catch (error) {
    return { kind: error instanceof RestApiClientError && (error.status === 401 || error.status === 403) ? 'denied' : 'uncertain' };
  }
};
export const listStatusMerchants = async (client = new RestApiClient({ runAs: 'user' })): Promise<MerchantListResult> => decodeMerchantList(await post({ kind: 'list' }, client));
export const readNativeStatus = async (connectionId: string, client = new RestApiClient({ runAs: 'user' })): Promise<StatusResult> => decodeStatus(await post({ kind: 'status', connectionId }, client));
