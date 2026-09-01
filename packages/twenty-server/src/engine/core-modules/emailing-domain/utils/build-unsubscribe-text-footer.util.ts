import { type EmailingPublicPageBrand } from 'src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';

export const buildUnsubscribeTextFooter = (
  webUrl: string,
  brand: EmailingPublicPageBrand,
): string => `\n\n--\n${brand.productName} unsubscribe: ${webUrl}`;
