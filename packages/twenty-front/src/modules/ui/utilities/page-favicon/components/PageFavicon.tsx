import { brandState } from '@/client-config/states/brandState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { Helmet } from '@dr.pogodin/react-helmet';
import { type ResolvedBrand } from 'twenty-shared/branding';

const DEFAULT_MHOO_FAVICON = '/images/mhoo/favicon/mhoo-favicon.ico';

export const getProductFaviconUrl = (
  brand: Pick<ResolvedBrand, 'assets'> | null,
  origin = window.location.origin,
): string =>
  new URL(
    brand?.assets.favicon.path ?? DEFAULT_MHOO_FAVICON,
    origin,
  ).toString();

export const PageFavicon = () => {
  const brand = useAtomStateValue(brandState);

  return (
    <Helmet>
      <link rel="icon" type="image/x-icon" href={getProductFaviconUrl(brand)} />
    </Helmet>
  );
};
