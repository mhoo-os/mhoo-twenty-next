import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { MHO_BRAND, type ProductBrand } from 'twenty-shared/branding';

import { useWorkspaceBypass } from '@/auth/sign-in-up/hooks/useWorkspaceBypass';
import { brandState } from '@/client-config/states/brandState';
import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import { ONBOARDING_CONTENT_BLOCK_WIDTH } from '@/onboarding/constants/OnboardingContentBlockWidth';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCopyContainer = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.4;
  max-width: ${ONBOARDING_CONTENT_BLOCK_WIDTH}px;
  text-align: center;

  & > a {
    color: ${themeCssVariables.font.color.tertiary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const StyledLinksContainer = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-wrap: nowrap;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
  max-width: 100%;
  text-align: center;
  white-space: nowrap;

  & > a,
  & > button {
    background: none;
    border: none;
    color: ${themeCssVariables.font.color.tertiary};
    cursor: pointer;
    font: inherit;
    padding: 0;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const StyledSeparator = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
`;

const StyledLegalUnavailable = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
`;

type FooterNoteProps = {
  secondaryAgreement?: 'privacyPolicy' | 'dataProcessingAgreement';
};

type LegalAgreement =
  | 'privacyPolicy'
  | 'dataProcessingAgreement'
  | 'termsOfService';

export const getApprovedLegalDocumentUrl = (
  brand: Pick<ProductBrand, 'legal'>,
  agreement: LegalAgreement,
): string | null => {
  const document =
    agreement === 'termsOfService'
      ? brand.legal.terms
      : agreement === 'privacyPolicy'
        ? brand.legal.privacy
        : brand.legal.dpa;

  if (document.status !== 'approved' || document.url?.trim().length === 0) {
    return null;
  }

  return document.url;
};

export const FooterNote = ({
  secondaryAgreement = 'privacyPolicy',
}: FooterNoteProps) => {
  const brand = useAtomStateValue(brandState) ?? MHO_BRAND;
  const { isOnAWorkspace } = useIsCurrentLocationOnAWorkspace();

  const { shouldOfferBypass, shouldUseBypass, enableBypass } =
    useWorkspaceBypass();

  const termsUrl = getApprovedLegalDocumentUrl(brand, 'termsOfService');
  const privacyUrl = getApprovedLegalDocumentUrl(brand, 'privacyPolicy');
  const secondaryAgreementUrl = getApprovedLegalDocumentUrl(
    brand,
    secondaryAgreement,
  );
  const hasGlobalLegalDocuments =
    termsUrl !== null || secondaryAgreementUrl !== null;
  const hasWorkspaceLegalDocuments = termsUrl !== null || privacyUrl !== null;

  if (!isOnAWorkspace) {
    return (
      <StyledCopyContainer>
        {hasGlobalLegalDocuments ? (
          <>
            <Trans>By using {brand.productName}, you agree to the</Trans>{' '}
            {termsUrl !== null && (
              <a href={termsUrl} target="_blank" rel="noopener noreferrer">
                <Trans>Terms of Service</Trans>
              </a>
            )}
            {termsUrl !== null && secondaryAgreementUrl !== null && (
              <>
                {' '}
                <Trans>and</Trans>{' '}
              </>
            )}
            {secondaryAgreementUrl !== null && (
              <a
                href={secondaryAgreementUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {secondaryAgreement === 'dataProcessingAgreement' ? (
                  <Trans>Data Processing Agreement</Trans>
                ) : (
                  <Trans>Privacy Policy</Trans>
                )}
              </a>
            )}
            .
          </>
        ) : (
          <Trans>Legal documents are currently unavailable.</Trans>
        )}
      </StyledCopyContainer>
    );
  }

  return (
    <StyledLinksContainer>
      {shouldOfferBypass && !shouldUseBypass && (
        <>
          <button type="button" onClick={enableBypass}>
            <Trans>Bypass SSO</Trans>
          </button>
          {hasWorkspaceLegalDocuments && <StyledSeparator>•</StyledSeparator>}
        </>
      )}
      {privacyUrl !== null && (
        <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
          <Trans>Privacy Policy</Trans>
        </a>
      )}
      {privacyUrl !== null && termsUrl !== null && (
        <StyledSeparator>•</StyledSeparator>
      )}
      {termsUrl !== null && (
        <a href={termsUrl} target="_blank" rel="noopener noreferrer">
          <Trans>Terms of Service</Trans>
        </a>
      )}
      {!hasWorkspaceLegalDocuments && (
        <StyledLegalUnavailable>
          <Trans>Legal documents are currently unavailable.</Trans>
        </StyledLegalUnavailable>
      )}
    </StyledLinksContainer>
  );
};
