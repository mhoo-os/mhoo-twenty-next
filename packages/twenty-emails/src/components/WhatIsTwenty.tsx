import { type I18n } from '@lingui/core';
import { Trans } from '@lingui/react';
import { MainText } from 'src/components/MainText';
import { SubTitle } from 'src/components/SubTitle';
import { type ResolvedBrand } from 'twenty-shared/branding';

type WhatIsProductProps = {
  i18n: I18n;
  brand: ResolvedBrand;
};

export const WhatIsProduct = ({ i18n, brand }: WhatIsProductProps) => {
  return (
    <>
      <SubTitle
        value={
          <Trans
            id="What is {productName}?"
            values={{ productName: brand.productName }}
          />
        }
      />
      <MainText>
        {i18n._(
          "It's a CRM, a software to help businesses manage their customer data and relationships efficiently.",
        )}
      </MainText>
    </>
  );
};
