import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { ApiPath } from 'twenty-shared/types';

import { UnsubscribeTokenService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service';
import { resolveEmailingPublicPageBrand } from 'src/engine/core-modules/emailing-domain/types/emailing-public-page-brand.type';
import { MessageSuppressionReason } from 'src/engine/core-modules/emailing-domain/types/message-suppression-reason.type';
import { MessageSuppressionSource } from 'src/engine/core-modules/emailing-domain/types/message-suppression-source.type';
import { type UnsubscribeTokenPayload } from 'src/engine/core-modules/emailing-domain/types/unsubscribe-token-payload.type';
import { buildUnsubscribePreferencesPage } from 'src/engine/core-modules/emailing-domain/utils/build-unsubscribe-preferences-page.util';
import { buildUnsubscribeResultPage } from 'src/engine/core-modules/emailing-domain/utils/build-unsubscribe-result-page.util';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { ProductBrandResolverService } from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';
import { MessageSuppressionService } from 'src/modules/emailing/services/message-suppression.service';

const UNSUBSCRIBE_TOKEN_FORMAT = /^[A-Za-z0-9_-]{1,1024}$/;

const UPDATE_PREFERENCES_PATH = `/${ApiPath.Emailing}/unsubscribe/preferences`;
const UNSUBSCRIBE_ALL_PATH = `/${ApiPath.Emailing}/unsubscribe/all`;

const HTML_CONTENT_TYPE = 'text/html; charset=utf-8';

type UnsubscribeFormBody = {
  t?: string;
  unsubscribeTopicId?: string | string[];
};

@Controller(`${ApiPath.Emailing}/unsubscribe`)
@UseGuards(PublicEndpointGuard, NoPermissionGuard)
export class UnsubscribeController {
  constructor(
    private readonly unsubscribeTokenService: UnsubscribeTokenService,
    private readonly messageSuppressionService: MessageSuppressionService,
    private readonly productBrandResolverService: ProductBrandResolverService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleOneClickUnsubscribe(@Query('t') token: string): Promise<void> {
    const payload = this.verifyTokenOrThrow(token);

    if (payload.preview === true) {
      return;
    }

    await this.messageSuppressionService.suppress({
      workspaceId: payload.workspaceId,
      emailAddress: payload.emailAddress,
      reason: MessageSuppressionReason.UNSUBSCRIBE,
      source: MessageSuppressionSource.SYSTEM,
      unsubscribeTopicId: payload.unsubscribeTopicId ?? null,
    });
  }

  @Get()
  @Header('Content-Type', HTML_CONTENT_TYPE)
  async handlePreferencesPage(@Query('t') token: string): Promise<string> {
    const payload = this.verifyTokenOrThrow(token);

    const topics = await this.messageSuppressionService.getTopicOptOutState({
      workspaceId: payload.workspaceId,
      emailAddress: payload.emailAddress,
    });

    const brand = resolveEmailingPublicPageBrand(
      this.productBrandResolverService.resolve(),
    );

    return buildUnsubscribePreferencesPage({
      token,
      topics,
      updatePath: UPDATE_PREFERENCES_PATH,
      unsubscribeAllPath: UNSUBSCRIBE_ALL_PATH,
      brand,
    });
  }

  @Post('preferences')
  @Header('Content-Type', HTML_CONTENT_TYPE)
  async handleUpdatePreferences(
    @Body() body: UnsubscribeFormBody,
  ): Promise<string> {
    const payload = this.verifyTokenOrThrow(body.t);

    if (payload.preview === true) {
      return buildUnsubscribeResultPage({
        title: 'Preview',
        message: 'This is a preview — no changes were saved.',
        brand: resolveEmailingPublicPageBrand(
          this.productBrandResolverService.resolve(),
        ),
      });
    }

    await this.messageSuppressionService.setTopicOptOuts({
      workspaceId: payload.workspaceId,
      emailAddress: payload.emailAddress,
      keptTopicIds: this.normalizeTopicIds(body.unsubscribeTopicId),
    });

    return buildUnsubscribeResultPage({
      title: 'Preferences updated',
      message: 'Your email preferences have been saved.',
      brand: resolveEmailingPublicPageBrand(
        this.productBrandResolverService.resolve(),
      ),
    });
  }

  @Post('all')
  @Header('Content-Type', HTML_CONTENT_TYPE)
  async handleUnsubscribeAll(
    @Body() body: UnsubscribeFormBody,
  ): Promise<string> {
    const payload = this.verifyTokenOrThrow(body.t);

    if (payload.preview === true) {
      return buildUnsubscribeResultPage({
        title: 'Preview',
        message: 'This is a preview — no changes were saved.',
        brand: resolveEmailingPublicPageBrand(
          this.productBrandResolverService.resolve(),
        ),
      });
    }

    await this.messageSuppressionService.suppress({
      workspaceId: payload.workspaceId,
      emailAddress: payload.emailAddress,
      reason: MessageSuppressionReason.UNSUBSCRIBE,
      source: MessageSuppressionSource.SYSTEM,
    });

    return buildUnsubscribeResultPage({
      title: 'You have been unsubscribed',
      message: 'You will no longer receive marketing emails from this sender.',
      brand: resolveEmailingPublicPageBrand(
        this.productBrandResolverService.resolve(),
      ),
    });
  }

  private normalizeTopicIds(
    unsubscribeTopicId: string | string[] | undefined,
  ): string[] {
    if (Array.isArray(unsubscribeTopicId)) {
      return unsubscribeTopicId.filter(isNonEmptyString);
    }

    return isNonEmptyString(unsubscribeTopicId) ? [unsubscribeTopicId] : [];
  }

  private verifyTokenOrThrow(
    token: string | undefined,
  ): UnsubscribeTokenPayload {
    if (!isNonEmptyString(token) || !UNSUBSCRIBE_TOKEN_FORMAT.test(token)) {
      throw new BadRequestException('Malformed unsubscribe token');
    }

    const payload = this.unsubscribeTokenService.verify(token);

    if (payload === null) {
      throw new BadRequestException('Invalid unsubscribe token');
    }

    return payload;
  }
}
