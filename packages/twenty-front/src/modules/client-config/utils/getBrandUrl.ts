import { type ProductBrand, type ResolvedBrand } from 'twenty-shared/branding';

type BrandWithUrls = Pick<ProductBrand, 'urls'> | Pick<ResolvedBrand, 'urls'>;

type BrandUrlKey = keyof ProductBrand['urls'];

export const getBrandUrl = (brand: BrandWithUrls, key: BrandUrlKey): string => {
  const url = brand.urls[key];

  return typeof url === 'string' ? url : url.value;
};
