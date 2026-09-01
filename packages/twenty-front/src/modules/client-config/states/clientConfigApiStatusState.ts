import { type ClientConfig } from '@/client-config/types/ClientConfig';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

type ClientConfigApiStatus = {
  isLoadedOnce: boolean;
  isLoading: boolean;
  isErrored: boolean;
  isSaved: boolean;
  lastSuccessfulFetchAt?: number;
  error?: Error;
  data?: { clientConfig: ClientConfig };
};

export const clientConfigApiStatusState =
  createAtomState<ClientConfigApiStatus>({
    key: 'clientConfigApiStatus',
    defaultValue: {
      isLoadedOnce: false,
      isLoading: false,
      isErrored: false,
      isSaved: false,
      lastSuccessfulFetchAt: undefined,
      error: undefined,
      data: undefined,
    },
  });
