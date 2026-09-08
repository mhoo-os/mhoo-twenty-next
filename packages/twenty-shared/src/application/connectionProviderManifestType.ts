import { type OAuthConnectionProviderConfig } from '@/application/oauthConnectionProviderConfigType';
import { type SyncableEntityOptions } from '@/application/syncableEntityOptionsType';

export type ConnectionProviderManifest = SyncableEntityOptions & {
  name: string;
  displayName: string;
  onConnectLogicFunction?: SyncableEntityOptions;
  onDisconnectLogicFunction?: SyncableEntityOptions;
} & (
    | { type: 'oauth'; oauth: OAuthConnectionProviderConfig }
    | { type: 'manualToken'; oauth?: never }
  );
