import { FlatConnectionProviderValidatorService } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/validators/services/flat-connection-provider-validator.service';

const provider = {
  universalIdentifier: 'provider',
  applicationUniversalIdentifier: 'app',
  name: 'clover-manual',
  displayName: 'Clover',
  type: 'manualToken',
  oauthConfig: null,
};
const maps = {
  flatConnectionProviderMaps: { byUniversalIdentifier: { provider } },
};
const validator = new FlatConnectionProviderValidatorService();

describe('native manual provider metadata validation', () => {
  it.each(['manualToken', 'mixed', 'unknown'])(
    'validates %s at the server boundary',
    (kind) => {
      const result = validator.validateFlatConnectionProviderCreation({
        flatEntityToValidate: {
          ...provider,
          type: kind === 'mixed' ? 'manualToken' : kind,
          oauthConfig: kind === 'mixed' ? {} : null,
        },
        optimisticFlatEntityMapsAndRelatedFlatEntityMaps: maps,
      } as never);
      expect(result.errors.length === 0).toBe(kind === 'manualToken');
    },
  );
  it.each([{ type: 'oauth' }, { oauthConfig: {} }])(
    'rejects changing manual credential semantics',
    (update) => {
      const result = validator.validateFlatConnectionProviderUpdate({
        universalIdentifier: 'provider',
        flatEntityUpdate: update,
        optimisticFlatEntityMapsAndRelatedFlatEntityMaps: maps,
      } as never);
      expect(result.errors).not.toHaveLength(0);
    },
  );
});
