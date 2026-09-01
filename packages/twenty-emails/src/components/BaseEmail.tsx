import { type JSX } from 'react';
import { I18nProvider } from '@lingui/react';
import { Container, Html } from 'react-email';

import { BaseHead } from 'src/components/BaseHead';
import { Footer } from 'src/components/Footer';
import { Logo } from 'src/components/Logo';
import { createI18nInstance } from 'src/utils/i18n.utils';
import { type ResolvedBrand } from 'twenty-shared/branding';
import { type APP_LOCALES } from 'twenty-shared/translations';

type BaseEmailProps = {
  children: JSX.Element | JSX.Element[] | string;
  width?: number;
  locale: keyof typeof APP_LOCALES;
  brand: ResolvedBrand;
};

export const BaseEmail = ({
  children,
  width,
  locale,
  brand,
}: BaseEmailProps) => {
  const i18nInstance = createI18nInstance(locale);

  return (
    <I18nProvider i18n={i18nInstance}>
      <Html lang={locale}>
        <BaseHead brand={brand} />
        <Container width={width || 290}>
          <Logo brand={brand} />
          {children}
          <Footer brand={brand} i18n={i18nInstance} />
        </Container>
      </Html>
    </I18nProvider>
  );
};
