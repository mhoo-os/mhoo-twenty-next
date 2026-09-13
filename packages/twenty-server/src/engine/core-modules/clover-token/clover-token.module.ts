import { Module } from '@nestjs/common';
import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { WorkspaceInvitationModule } from 'src/engine/core-modules/workspace-invitation/workspace-invitation.module';

import { CloverTokenController } from 'src/engine/core-modules/clover-token/clover-token.controller';
import { CloverTokenService } from 'src/engine/core-modules/clover-token/clover-token.service';
import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { ConnectedAccountTokenEncryptionModule } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';

@Module({
  imports: [
    TokenModule,
    WorkspaceCacheStorageModule,
    WorkspaceInvitationModule,
    SecureHttpClientModule,
    ConnectedAccountTokenEncryptionModule,
    PermissionsModule,
  ],
  controllers: [CloverTokenController],
  providers: [CloverTokenService],
})
export class CloverTokenModule {}
