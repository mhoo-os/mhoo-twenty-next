import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import crypto from 'crypto';

import { msg } from '@lingui/core/macro';
import { addMilliseconds } from 'date-fns';
import ms from 'ms';
import { MhooPlatformInvitationEmail, renderEmail } from 'twenty-emails';
import { type APP_LOCALES } from 'twenty-shared/translations';
import { AppPath } from 'twenty-shared/types';
import { IsNull, MoreThan, Repository } from 'typeorm';

import {
  AppTokenEntity,
  AppTokenType,
} from 'src/engine/core-modules/app-token/app-token.entity';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';
import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { buildUrlWithPathnameAndSearchParams } from 'src/engine/core-modules/domain/domain-server-config/utils/build-url-with-pathname-and-search-params.util';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { buildEmailSender } from 'src/engine/core-modules/email/utils/build-email-sender';
import { I18nService } from 'src/engine/core-modules/i18n/i18n.service';
import { ThrottlerService } from 'src/engine/core-modules/throttler/throttler.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { ProductBrandResolverService } from 'src/engine/core-modules/twenty-config/services/product-brand-resolver.service';
import { type MhooPlatformInvitationDTO } from 'src/engine/core-modules/auth/dto/mhoo-platform-invitation.dto';

const PLATFORM_INVITATION_EXPIRY = '7d';
const PLATFORM_INVITATION_MAX_PER_DAY = 25;
const PLATFORM_INVITATION_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MhooPlatformInvitationService {
  constructor(
    @InjectRepository(AppTokenEntity)
    private readonly appTokenRepository: Repository<AppTokenEntity>,
    private readonly domainServerConfigService: DomainServerConfigService,
    private readonly emailService: EmailService,
    private readonly i18nService: I18nService,
    private readonly productBrandResolverService: ProductBrandResolverService,
    private readonly throttlerService: ThrottlerService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async sendInvitation({
    email,
    inviter,
  }: {
    email: string;
    inviter: AuthContextUser;
  }): Promise<MhooPlatformInvitationDTO> {
    if (!inviter.canAccessFullAdminPanel) {
      throw new AuthException(
        'Only authorized Mhoo operators can send platform invitations',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    }

    const normalizedEmail = this.normalizeEmail(email);

    await this.throttlerService.tokenBucketThrottleOrThrow(
      `mhoo-platform-invitation:${inviter.id}`,
      1,
      PLATFORM_INVITATION_MAX_PER_DAY,
      PLATFORM_INVITATION_WINDOW_MS,
    );

    const existingInvitations = await this.appTokenRepository.find({
      where: {
        type: AppTokenType.MhooPlatformInvitationToken,
        deletedAt: IsNull(),
      },
    });

    for (const existingInvitation of existingInvitations) {
      if (existingInvitation.context?.email === normalizedEmail) {
        existingInvitation.deletedAt = new Date();
        await this.appTokenRepository.save(existingInvitation);
      }
    }

    const expiresAt = addMilliseconds(
      new Date(),
      ms(PLATFORM_INVITATION_EXPIRY),
    );
    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(plainToken);
    const invitation = this.appTokenRepository.create({
      userId: inviter.id,
      workspaceId: null,
      type: AppTokenType.MhooPlatformInvitationToken,
      value: hashedToken,
      expiresAt,
      context: { email: normalizedEmail },
    });

    await this.appTokenRepository.save(invitation);

    const link = buildUrlWithPathnameAndSearchParams({
      baseUrl: this.domainServerConfigService.getFrontUrl(),
      pathname: AppPath.SignInUp,
      searchParams: {
        mhooInvitationToken: plainToken,
        email: normalizedEmail,
      },
    });
    const brand = this.productBrandResolverService.resolve();
    const locale = inviter.locale as keyof typeof APP_LOCALES;
    const emailTemplate = MhooPlatformInvitationEmail({
      brand,
      inviter: {
        email: inviter.email,
        firstName: inviter.firstName,
        lastName: inviter.lastName,
      },
      link: link.toString(),
      locale,
    });
    const html = await renderEmail(emailTemplate);
    const text = await renderEmail(emailTemplate, { plainText: true });
    const i18n = this.i18nService.getI18nInstance(locale);

    await this.emailService.send({
      from: buildEmailSender({
        brand,
        address: this.twentyConfigService.get('EMAIL_FROM_ADDRESS'),
      }),
      to: normalizedEmail,
      subject: i18n._(msg`You're invited to ${brand.productName}`),
      text,
      html,
    });

    return { email: normalizedEmail, expiresAt };
  }

  async validateInvitationForEmail({
    token,
    email,
  }: {
    token: string;
    email: string;
  }): Promise<AppTokenEntity> {
    const invitation = await this.findInvitation(token);

    if (
      !invitation ||
      invitation.context?.email !== this.normalizeEmail(email)
    ) {
      throw new AuthException(
        'Invalid Mhoo platform invitation',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    }

    return invitation;
  }

  async consumeInvitationForEmail({
    token,
    email,
  }: {
    token: string;
    email: string;
  }): Promise<void> {
    const invitation = await this.validateInvitationForEmail({ token, email });
    const result = await this.appTokenRepository.update(
      {
        id: invitation.id,
        deletedAt: IsNull(),
      },
      { deletedAt: new Date() },
    );

    if (!result.affected) {
      throw new AuthException(
        'Mhoo platform invitation has already been used',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    }
  }

  private async findInvitation(token: string) {
    return this.appTokenRepository.findOne({
      where: {
        value: this.hashToken(token),
        type: AppTokenType.MhooPlatformInvitationToken,
        deletedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
