import { type ResolvedBrand } from 'twenty-shared/branding';

const sanitizeHeaderText = (value: string): string =>
  value.replace(/[\r\n]+/g, ' ').trim();

export const buildEmailSender = ({
  brand,
  address,
  senderName,
}: {
  brand: ResolvedBrand;
  address: string;
  senderName?: string;
}): string => {
  const safeAddress = sanitizeHeaderText(address);
  const safeBrandName = sanitizeHeaderText(brand.legal.senderDisplayName);
  const safeSenderName = senderName
    ? sanitizeHeaderText(senderName)
    : undefined;
  const displayName = safeSenderName
    ? `${safeSenderName} (via ${safeBrandName})`
    : safeBrandName;

  return `${displayName} <${safeAddress}>`;
};
