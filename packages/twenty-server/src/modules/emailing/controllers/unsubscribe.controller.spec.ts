import { BadRequestException } from '@nestjs/common';

import { UnsubscribeTokenService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service';
import { type UnsubscribeTokenPayload } from 'src/engine/core-modules/emailing-domain/types/unsubscribe-token-payload.type';
import {
  ProductBrandResolverService,
  resolveProductBrand,
} from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';
import { MessageSuppressionService } from 'src/modules/emailing/services/message-suppression.service';
import { UnsubscribeController } from 'src/modules/emailing/controllers/unsubscribe.controller';

const payload: UnsubscribeTokenPayload = {
  workspaceId: 'workspace-id',
  emailAddress: 'person@example.com',
  issuedAt: 1,
};

const createController = (
  tokenPayload: UnsubscribeTokenPayload | null = payload,
) => {
  const unsubscribeTokenService = {
    verify: jest.fn().mockReturnValue(tokenPayload),
  } as unknown as UnsubscribeTokenService;
  const messageSuppressionService = {
    getTopicOptOutState: jest.fn().mockResolvedValue([]),
    setTopicOptOuts: jest.fn().mockResolvedValue(undefined),
    suppress: jest.fn().mockResolvedValue(undefined),
  } as unknown as MessageSuppressionService;
  const productBrandResolverService = {
    resolve: jest.fn().mockReturnValue(
      resolveProductBrand({
        preset: 'mhoo',
        deploymentOrigin: 'https://mhoo.example',
      }),
    ),
  } as unknown as ProductBrandResolverService;

  return {
    controller: new UnsubscribeController(
      unsubscribeTokenService,
      messageSuppressionService,
      productBrandResolverService,
    ),
    unsubscribeTokenService,
    messageSuppressionService,
    productBrandResolverService,
  };
};

describe('UnsubscribeController', () => {
  it('renders the preferences page with the resolved product brand', async () => {
    const { controller, messageSuppressionService } = createController();

    const page = await controller.handlePreferencesPage('token');

    expect(page).toContain('<title>Mhoo email preferences</title>');
    expect(page).toContain('mhoo-email-600x436.png');
    expect(page).toContain('href="https://mhoo.example/legal/privacy"');
    expect(page).toContain('href="https://mhoo.example/legal/dpa"');
    expect(page).toContain('DPA Status</a>');
    expect(page).not.toContain('Legal documents are currently unavailable.');
    expect(messageSuppressionService.getTopicOptOutState).toHaveBeenCalledWith({
      workspaceId: payload.workspaceId,
      emailAddress: payload.emailAddress,
    });
  });

  it('keeps preview updates side-effect free while rendering the brand', async () => {
    const previewPayload = { ...payload, preview: true };
    const {
      controller,
      messageSuppressionService,
      productBrandResolverService,
    } = createController(previewPayload);

    const page = await controller.handleUpdatePreferences({ t: 'token' });

    expect(page).toContain('<title>Preview</title>');
    expect(page).toContain('>Mhoo</span>');
    expect(messageSuppressionService.setTopicOptOuts).not.toHaveBeenCalled();
    expect(productBrandResolverService.resolve).toHaveBeenCalledTimes(1);
  });

  it('preserves suppression behavior for a successful unsubscribe', async () => {
    const { controller, messageSuppressionService } = createController();

    const page = await controller.handleUnsubscribeAll({ t: 'token' });

    expect(page).toContain('You have been unsubscribed');
    expect(messageSuppressionService.suppress).toHaveBeenCalledWith({
      workspaceId: payload.workspaceId,
      emailAddress: payload.emailAddress,
      reason: 'UNSUBSCRIBE',
      source: 'SYSTEM',
    });
  });

  it('rejects malformed tokens before resolving branding or mutating state', async () => {
    const {
      controller,
      messageSuppressionService,
      productBrandResolverService,
    } = createController();

    await expect(
      controller.handleUnsubscribeAll({ t: '<malformed>' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productBrandResolverService.resolve).not.toHaveBeenCalled();
    expect(messageSuppressionService.suppress).not.toHaveBeenCalled();
  });
});
