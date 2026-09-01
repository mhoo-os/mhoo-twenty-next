import { Img } from 'react-email';

import { getBrandAssetUrl } from 'src/utils/brand';
import { type ResolvedBrand } from 'twenty-shared/branding';

const logoStyle = {
  marginBottom: '40px',
};

export const Logo = ({ brand }: { brand: ResolvedBrand }) => {
  const dimensions = brand.assets.emailMark.dimensions;
  const [assetWidth, assetHeight] = Array.isArray(dimensions[0])
    ? dimensions[0]
    : dimensions;
  const renderedWidth = 40;
  const renderedHeight = Math.max(
    1,
    Math.round((renderedWidth * assetHeight) / assetWidth),
  );

  return (
    <Img
      src={getBrandAssetUrl(brand, brand.assets.emailMark)}
      alt={brand.accessibility.logoAltText}
      width={renderedWidth}
      height={renderedHeight}
      style={logoStyle}
    />
  );
};
