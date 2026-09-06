import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PermissionFlagType } from 'twenty-shared/constants';
import { ConnectedAccountProvider } from 'twenty-shared/types';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { DataSource, type EntityManager, IsNull, MoreThan } from 'typeorm';

import {
  AppTokenEntity,
  AppTokenType,
} from 'src/engine/core-modules/app-token/app-token.entity';
import { plaintextStringSchema } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

export type CloverActor = {
  userId: string;
  workspaceId: string;
  userWorkspaceId: string;
};

export type CloverReceipt = {
  connectedAccountId: string;
  merchantId: string;
  merchantName: string;
  savedAt: string;
};

// One merchant per enabled Workspace. Native membership and permissions are
// checked on every request; the deployment setting only narrows availability.
@Injectable()
export class CloverTokenService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: TwentyConfigService,
    private readonly permissions: PermissionsService,
    private readonly encryption: ConnectedAccountTokenEncryptionService,
    private readonly http: SecureHttpClientService,
  ) {}

  async status(actor: CloverActor) {
    if (this.config.get('CLOVER_TOKEN_WORKSPACE_ID') !== actor.workspaceId) {
      return { enabled: false, receipt: null };
    }

    await this.authorize(actor, this.dataSource.manager);
    const account = await this.findAccount(
      this.dataSource.manager,
      actor.workspaceId,
    );

    return { enabled: true, receipt: account ? this.receipt(account) : null };
  }

  async begin(actor: CloverActor, merchantId: string) {
    if (!/^[A-Z0-9]{13}$/.test(merchantId)) {
      throw new BadRequestException(
        'Enter the 13-character Clover merchant ID.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await this.authorize(actor, manager, true);
      if (await this.findAccount(manager, actor.workspaceId)) {
        throw new ConflictException(
          'This Workspace already has a Clover connection.',
        );
      }

      const requests = manager.getRepository(AppTokenEntity);
      const now = new Date();
      const where = {
        type: AppTokenType.CloverTokenHandoff,
        userId: actor.userId,
        workspaceId: actor.workspaceId,
        deletedAt: IsNull(),
        expiresAt: MoreThan(now),
      };
      if ((await requests.countBy(where)) >= 5) {
        throw new ConflictException(
          'Please wait ten minutes before starting again.',
        );
      }

      // A new request invalidates earlier forms for this member.
      await requests.update(
        { ...where, revokedAt: IsNull() },
        { revokedAt: now },
      );
      const request = await requests.save(
        requests.create({
          type: AppTokenType.CloverTokenHandoff,
          userId: actor.userId,
          workspaceId: actor.workspaceId,
          expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
          context: {
            cloverHandoff: {
              merchantId,
              userWorkspaceId: actor.userWorkspaceId,
            },
          },
        }),
      );

      return {
        requestId: request.id,
        merchantId,
        expiresAt: request.expiresAt.toISOString(),
      };
    });
  }

  async submit(
    actor: CloverActor,
    input: {
      requestId: string;
      accessToken: string;
      readOnlyConfirmed: boolean;
    },
  ): Promise<CloverReceipt> {
    // Validation also lives in the service, so no internal caller can bypass it.
    if (
      input.readOnlyConfirmed !== true ||
      !/^[\x21-\x7e]{20,2048}$/.test(input.accessToken) ||
      input.accessToken.startsWith('enc:')
    ) {
      throw new BadRequestException(
        'Paste a Clover token and confirm that only Read permissions are selected.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // Serializes new requests and submissions for this Workspace, including
      // two different users racing to connect the same merchant.
      await this.authorize(actor, manager, true);
      const requests = manager.getRepository(AppTokenEntity);
      const request = await requests.findOne({
        where: {
          id: input.requestId,
          type: AppTokenType.CloverTokenHandoff,
          userId: actor.userId,
          workspaceId: actor.workspaceId,
          deletedAt: IsNull(),
        },
        lock: { mode: 'pessimistic_write' },
      });
      const handoff = request?.context?.cloverHandoff;

      if (
        !request ||
        !handoff ||
        handoff.userWorkspaceId !== actor.userWorkspaceId
      ) {
        throw new ForbiddenException(
          'This handoff is unavailable. Start again in your Workspace.',
        );
      }

      if (request.revokedAt && handoff.connectedAccountId) {
        const account = await this.findAccount(manager, actor.workspaceId);
        if (account?.id === handoff.connectedAccountId)
          return this.receipt(account);
      }

      if (request.revokedAt || request.expiresAt.getTime() <= Date.now()) {
        throw new ConflictException('This handoff expired. Start again.');
      }
      if (await this.findAccount(manager, actor.workspaceId)) {
        throw new ConflictException(
          'This Workspace already has a Clover connection.',
        );
      }

      const merchantName = await this.verifyMerchant(
        handoff.merchantId,
        input.accessToken,
      );
      const encrypted = this.encryption.encrypt({
        plaintext: plaintextStringSchema.parse(input.accessToken),
        workspaceId: actor.workspaceId,
      });
      const accounts = manager.getRepository(ConnectedAccountEntity);
      const account = await accounts.save(
        accounts.create({
          workspaceId: actor.workspaceId,
          userWorkspaceId: actor.userWorkspaceId,
          provider: ConnectedAccountProvider.CLOVER,
          handle: handoff.merchantId,
          name: merchantName,
          visibility: 'workspace',
          accessToken: encrypted,
          refreshToken: null,
          // A merchant's confirmation is not proof of provider scopes.
          scopes: null,
        }),
      );

      request.revokedAt = new Date();
      request.context = {
        cloverHandoff: { ...handoff, connectedAccountId: account.id },
      };
      await requests.save(request);

      // The transaction commits before this promise resolves to the controller.
      return this.receipt(account);
    });
  }

  private async authorize(
    actor: CloverActor,
    manager: EntityManager,
    lock = false,
  ) {
    if (
      !actor.userId ||
      !actor.userWorkspaceId ||
      this.config.get('CLOVER_TOKEN_WORKSPACE_ID') !== actor.workspaceId
    ) {
      throw new ForbiddenException(
        'Clover intake is unavailable for this Workspace.',
      );
    }
    const workspace = await manager.getRepository(WorkspaceEntity).findOne({
      where: { id: actor.workspaceId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    const member = await manager.getRepository(UserWorkspaceEntity).findOne({
      where: {
        id: actor.userWorkspaceId,
        userId: actor.userId,
        workspaceId: actor.workspaceId,
      },
      ...(lock ? { lock: { mode: 'pessimistic_read' as const } } : {}),
    });

    if (
      workspace?.activationStatus !== WorkspaceActivationStatus.ACTIVE ||
      !member ||
      !(await this.permissions.userHasWorkspaceSettingPermission({
        userWorkspaceId: actor.userWorkspaceId,
        workspaceId: actor.workspaceId,
        setting: PermissionFlagType.CONNECTED_ACCOUNTS,
      }))
    ) {
      throw new ForbiddenException(
        'You need permission to manage connections in this Workspace.',
      );
    }
  }

  private findAccount(manager: EntityManager, workspaceId: string) {
    return manager.getRepository(ConnectedAccountEntity).findOne({
      where: { workspaceId, provider: ConnectedAccountProvider.CLOVER },
      select: { id: true, handle: true, name: true, updatedAt: true },
    });
  }

  private receipt(account: ConnectedAccountEntity): CloverReceipt {
    return {
      connectedAccountId: account.id,
      merchantId: account.handle,
      merchantName: account.name ?? 'Clover merchant',
      savedAt: account.updatedAt.toISOString(),
    };
  }

  private async verifyMerchant(
    merchantId: string,
    accessToken: string,
  ): Promise<string> {
    try {
      // Fixed production origin; no user URL, redirects, retries, or logged
      // Axios errors (which contain the Authorization header).
      const response = await this.http
        .getHttpClient({
          timeout: 8000,
          maxRedirects: 0,
          retries: 0,
          maxContentLength: 16384,
          maxBodyLength: 4096,
        })
        .get(`https://api.clover.com/v3/merchants/${merchantId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: 'id,name' },
        });
      if (
        response.data?.id !== merchantId ||
        typeof response.data?.name !== 'string'
      ) {
        throw new Error('Invalid merchant response');
      }
      return response.data.name.slice(0, 200);
    } catch {
      throw new ServiceUnavailableException(
        'Clover could not verify this merchant and token. Check both values and try again.',
      );
    }
  }
}
