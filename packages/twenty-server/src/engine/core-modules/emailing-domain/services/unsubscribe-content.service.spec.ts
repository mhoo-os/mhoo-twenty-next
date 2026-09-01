import { type EmailingDomainSendEmailInput } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-input.type';
import { UnsubscribeTokenService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service';
import { UnsubscribeContentService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-content.service';
import {
  resolveProductBrand,
  ProductBrandResolverService,
} from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';

describe('UnsubscribeContentService', () => {
  it('uses the resolved product brand for HTML and text footers', () => {
    const unsubscribeTokenService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    } as unknown as UnsubscribeTokenService;
    const productBrandResolverService = {
      resolve: jest.fn().mockReturnValue(
        resolveProductBrand({
          preset: 'mhoo',
          deploymentOrigin: 'https://mhoo.example',
        }),
      ),
    } as unknown as ProductBrandResolverService;
    const service = new UnsubscribeContentService(
      unsubscribeTokenService,
      productBrandResolverService,
    );
    const email: EmailingDomainSendEmailInput = {
      workspaceId: 'workspace-id',
      domain: 'mail.example',
      from: 'sender@mail.example',
      to: ['person@example.com'],
      subject: 'Subject',
      text: 'Plain text',
      html: '<html><body><p>HTML</p></body></html>',
    };

    const result = service.addTo(email, 'https://unsubscribe.example');

    expect(result.text).toContain('Mhoo unsubscribe:');
    expect(result.html).toContain("Don't want these Mhoo emails?");
    expect(result.text).not.toContain('twenty.com');
    expect(result.html).not.toContain('twenty.com');
    expect(productBrandResolverService.resolve).toHaveBeenCalledTimes(1);
  });

  it('does not add a footer when unsubscribe is unavailable', () => {
    const unsubscribeTokenService = {
      sign: jest.fn(),
    } as unknown as UnsubscribeTokenService;
    const productBrandResolverService = {
      resolve: jest.fn(),
    } as unknown as ProductBrandResolverService;
    const service = new UnsubscribeContentService(
      unsubscribeTokenService,
      productBrandResolverService,
    );
    const email: EmailingDomainSendEmailInput = {
      workspaceId: 'workspace-id',
      domain: 'mail.example',
      from: 'sender@mail.example',
      to: ['person@example.com'],
      subject: 'Subject',
      text: 'Plain text',
      html: '<p>HTML</p>',
    };

    expect(service.addTo(email, null)).toBe(email);
    expect(productBrandResolverService.resolve).not.toHaveBeenCalled();
  });
});
