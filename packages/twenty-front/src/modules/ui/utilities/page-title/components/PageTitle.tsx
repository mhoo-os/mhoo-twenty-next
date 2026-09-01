import { brandState } from '@/client-config/states/brandState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { Helmet } from '@dr.pogodin/react-helmet';
import { type ResolvedBrand } from 'twenty-shared/branding';

const DEFAULT_PRODUCT_NAME = 'Mhoo';
const DEFAULT_TITLE_TEMPLATE = '%s · Mhoo';

type PageTitleBrand = Pick<
  ResolvedBrand,
  'productName' | 'documentTitleTemplate'
>;

const removeLegacyProductSuffix = (title: string): string =>
  title.replace(/\s*(?:\||·)\s*(?:Twenty|Mhoo)\s*$/i, '').trim();

export const getBrandedPageTitle = (
  title: string,
  brand: PageTitleBrand | null,
): string => {
  const productName = brand?.productName ?? DEFAULT_PRODUCT_NAME;
  const normalizedTitle = removeLegacyProductSuffix(title);

  if (
    normalizedTitle.length === 0 ||
    normalizedTitle.toLowerCase() === 'twenty' ||
    normalizedTitle.toLowerCase() === 'mhoo' ||
    normalizedTitle === productName
  ) {
    return productName;
  }

  return (brand?.documentTitleTemplate ?? DEFAULT_TITLE_TEMPLATE).replace(
    '%s',
    normalizedTitle,
  );
};

type PageTitleProps = {
  title: string;
};

export const PageTitle = (props: PageTitleProps) => {
  const brand = useAtomStateValue(brandState);

  return (
    <Helmet>
      <title>{getBrandedPageTitle(props.title, brand)}</title>
    </Helmet>
  );
};
