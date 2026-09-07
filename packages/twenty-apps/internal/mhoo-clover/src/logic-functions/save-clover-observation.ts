import { type RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import { type CloverMerchantObservation } from '../contracts/merchant-observation';
import { cloverSourceKey } from '../contracts/source-identity';

// Native record ID reuses the account UUID in a different object namespace.
// Reconnection creates a new lineage; no secret is stored in these records.
export const saveCloverObservation = async (
  client: RestApiClient,
  observation: CloverMerchantObservation,
) => {
  const { connectedAccountId, ...facts } = observation;
  const connection = {
    id: connectedAccountId,
    connectedAccountId,
    merchantId: observation.merchantId,
    environment: 'production-na',
    connectionKey: cloverSourceKey(
      connectedAccountId,
      'connection',
      observation.merchantId,
    ),
    status: 'observed',
  };
  const options = { signal: AbortSignal.timeout(4000) };
  const read = () =>
    client.get<{ data: { cloverConnection: typeof connection } }>(
      `/rest/cloverConnections/${connectedAccountId}`,
      options,
    );
  let existing;
  try {
    existing = await read();
  } catch (error) {
    if (!(error instanceof RestApiClientError) || error.status !== 404)
      throw error;
    try {
      await client.post('/rest/cloverConnections', connection, options);
    } catch {
      /* A concurrent creator may have won. Verify its exact identity below. */
    }
    existing = await read();
  }
  const bound = existing.data.cloverConnection;
  if (
    !bound ||
    bound.connectedAccountId !== connectedAccountId ||
    bound.merchantId !== connection.merchantId ||
    bound.environment !== connection.environment ||
    bound.connectionKey !== connection.connectionKey
  )
    throw new Error('Connection record binding mismatch');
  return client.post(
    '/rest/cloverMerchantObservations',
    { ...facts, connectionId: connectedAccountId },
    options,
  );
};
