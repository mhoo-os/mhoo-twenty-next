import { Font, Head } from 'react-email';

import { canvasTheme } from 'src/common-style';
import { type ResolvedBrand } from 'twenty-shared/branding';

export const BaseHead = ({ brand }: { brand: ResolvedBrand }) => {
  const title = `${brand.productName} email`;

  return (
    <Head>
      <title>{title}</title>
      <Font
        fontFamily={canvasTheme.font.family}
        fallbackFontFamily="sans-serif"
        fontStyle="normal"
        fontWeight={canvasTheme.font.weight.regular}
      />
    </Head>
  );
};
