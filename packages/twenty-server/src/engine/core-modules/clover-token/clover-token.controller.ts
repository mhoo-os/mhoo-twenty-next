import {
  type ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  type ExceptionFilter,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpException,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import {
  Equals,
  isEmail,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Request, type Response } from 'express';

import {
  CloverTokenService,
  type CloverActor,
} from 'src/engine/core-modules/clover-token/clover-token.service';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PermissionFlagType } from 'twenty-shared/constants';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceInvitationService } from 'src/engine/core-modules/workspace-invitation/services/workspace-invitation.service';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

export class BeginCloverHandoffInput {
  @IsString()
  @Matches(/^[A-Z0-9]{13}$/)
  merchantId: string;
}

export class SubmitCloverTokenInput {
  @IsUUID('4')
  requestId: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2048)
  accessToken: string;

  @Equals(true)
  readOnlyConfirmed: boolean;
}

// Never pass credential request bodies or underlying errors to shared logging.
// Database/HTTP errors can carry parameters, so unexpected failures are opaque.
@Catch()
export class CloverTokenExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message =
      exception instanceof HttpException && status !== 500
        ? exception.message
        : 'The token could not be saved. Please try again.';

    response.setHeader('Cache-Control', 'no-store');
    response.status(status).json({ message });
  }
}

@Controller('clover-token')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
@UseFilters(CloverTokenExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
    exceptionFactory: () =>
      new BadRequestException(
        'Check the merchant ID, token, and Read-only confirmation.',
      ),
  }),
)
export class CloverTokenController {
  constructor(
    private readonly service: CloverTokenService,
    private readonly config: TwentyConfigService,
    private readonly invitations: WorkspaceInvitationService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get('status')
  @Header('Cache-Control', 'no-store')
  async status(@Req() request: Request) {
    const actor = this.actor(request);
    const status = await this.service.status(actor);
    return {
      ...status,
      canPrepareInvitation:
        status.enabled &&
        isEmail(this.config.get('CLOVER_TOKEN_INVITEE_EMAIL')) &&
        (await this.permissions.userHasWorkspaceSettingPermission({
          userWorkspaceId: actor.userWorkspaceId,
          workspaceId: actor.workspaceId,
          setting: PermissionFlagType.WORKSPACE_MEMBERS,
        })),
    };
  }

  @Post('prepare-invitation')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async prepareInvitation(@Req() request: Request) {
    const actor = this.actor(request);
    const status = await this.status(request);
    if (!status.canPrepareInvitation || !request.workspace) {
      throw new ForbiddenException(
        'Only an authorized Workspace administrator can prepare this invitation.',
      );
    }
    const email = this.config
      .get('CLOVER_TOKEN_INVITEE_EMAIL')
      .trim()
      .toLowerCase();
    // Native Twenty creates and consumes the email-bound invitation. This
    // endpoint neither creates a user/membership nor sends an email. Native
    // sign-in discovers the pending invitation for the verified email.
    const invitation =
      (await this.invitations.getOneWorkspaceInvitation(
        actor.workspaceId,
        email,
      )) ??
      (await this.invitations.createWorkspaceInvitation(
        email,
        request.workspace,
      ));
    return { email, expiresAt: invitation.expiresAt.toISOString() };
  }

  @Post('begin')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  begin(@Req() request: Request, @Body() input: BeginCloverHandoffInput) {
    return this.service.begin(this.actor(request), input.merchantId);
  }

  @Post('submit')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  submit(@Req() request: Request, @Body() input: SubmitCloverTokenInput) {
    return this.service.submit(this.actor(request), input);
  }

  private actor(request: Request): CloverActor {
    // Require an interactive native Twenty user, never an API key/App token.
    // Explicit bearer auth makes ambient-cookie CSRF insufficient.
    if (
      !request.user ||
      !request.userWorkspaceId ||
      !request.workspace ||
      request.apiKey ||
      request.application ||
      !request.headers.authorization?.startsWith('Bearer ')
    ) {
      throw new ForbiddenException(
        'Sign in to your Workspace to connect Clover.',
      );
    }
    return {
      userId: request.user.id,
      workspaceId: request.workspace.id,
      userWorkspaceId: request.userWorkspaceId,
    };
  }
}
