import { useClientConfig } from '@/client-config/hooks/useClientConfig';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useCallback, useEffect } from 'react';
import { isDefined } from 'twenty-shared/utils';

export const CLIENT_CONFIG_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const isClientConfigStale = (
  lastSuccessfulFetchAt: number | undefined,
  now = Date.now(),
): boolean =>
  lastSuccessfulFetchAt === undefined ||
  now - lastSuccessfulFetchAt >= CLIENT_CONFIG_REFRESH_INTERVAL_MS;

export const ClientConfigProviderEffect = () => {
  const [clientConfigApiStatus, setClientConfigApiStatus] = useAtomState(
    clientConfigApiStatusState,
  );

  const { data, loading, error, fetchClientConfig } = useClientConfig();

  const refetchIfStale = useCallback(() => {
    if (
      !clientConfigApiStatus.isLoadedOnce ||
      clientConfigApiStatus.isLoading ||
      !isClientConfigStale(clientConfigApiStatus.lastSuccessfulFetchAt)
    ) {
      return;
    }

    void fetchClientConfig();
  }, [
    clientConfigApiStatus.isLoadedOnce,
    clientConfigApiStatus.isLoading,
    clientConfigApiStatus.lastSuccessfulFetchAt,
    fetchClientConfig,
  ]);

  useEffect(() => {
    if (
      !clientConfigApiStatus.isLoadedOnce &&
      !clientConfigApiStatus.isLoading
    ) {
      void fetchClientConfig();
    }
  }, [
    clientConfigApiStatus.isLoadedOnce,
    clientConfigApiStatus.isLoading,
    fetchClientConfig,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('focus', refetchIfStale);
    window.addEventListener('online', refetchIfStale);
    const refreshInterval = window.setInterval(
      refetchIfStale,
      CLIENT_CONFIG_REFRESH_INTERVAL_MS,
    );

    return () => {
      window.removeEventListener('focus', refetchIfStale);
      window.removeEventListener('online', refetchIfStale);
      window.clearInterval(refreshInterval);
    };
  }, [refetchIfStale]);

  useEffect(() => {
    if (loading) return;

    if (error instanceof Error) {
      setClientConfigApiStatus((currentStatus) => ({
        ...currentStatus,
        isErrored: true,
        error,
      }));
      return;
    }

    if (!isDefined(data?.clientConfig)) {
      return;
    }
  }, [data?.clientConfig, error, loading, setClientConfigApiStatus]);

  return <></>;
};
