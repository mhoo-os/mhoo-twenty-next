import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

import {
  type AuthTokenPair,
  RenewTokenDocument,
  type RenewTokenMutation,
  type RenewTokenMutationVariables,
} from '~/generated-metadata/graphql';
import { isUndefinedOrNull } from '~/utils/isUndefinedOrNull';

const renewTokenMutation = async (
  uri: string | undefined,
  refreshToken: string,
) => {
  const httpLink = new HttpLink({ uri, credentials: 'include' });

  const client = new ApolloClient({
    // Renewal carries refresh and access credentials, including in debug mode.
    link: httpLink,
    cache: new InMemoryCache({}),
  });

  const result = await client.mutate<
    RenewTokenMutation,
    RenewTokenMutationVariables
  >({
    mutation: RenewTokenDocument,
    variables: {
      appToken: refreshToken,
    },
    fetchPolicy: 'network-only',
  });

  if (isUndefinedOrNull(result.data)) {
    throw new Error('Token renewal returned empty data');
  }

  return result.data;
};

export const renewToken = async (
  uri: string | undefined,
  tokenPair: AuthTokenPair | undefined | null,
) => {
  if (!tokenPair) {
    throw new Error('Refresh token is not defined');
  }

  const data = await renewTokenMutation(uri, tokenPair.refreshToken.token);

  return data?.renewToken.tokens;
};
