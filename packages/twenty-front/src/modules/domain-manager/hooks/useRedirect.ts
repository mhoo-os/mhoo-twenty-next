// Don't use this hook directly! Prefer the high level hooks like:
// useRedirectToDefaultDomain and useRedirectToWorkspaceDomain

import { useDebouncedCallback } from 'use-debounce';

export const useRedirect = () => {
  const redirect = useDebouncedCallback((url: string, target?: string) => {
    const navigationTarget = target ?? '_self';

    // A redirect to this document would restart bootstrap without changing route.
    if (
      navigationTarget === '_self' &&
      new URL(url, window.location.href).href === window.location.href
    ) {
      return;
    }

    window.open(url, navigationTarget);
  }, 1);

  return {
    redirect,
  };
};
