import { AUTO_SELECT_FAST_MODEL_ID } from 'twenty-shared/constants';

import {
  AiModelRegistryService,
  type RegisteredAiModel,
} from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';

const HASS_MODEL_ID = 'hass/gpt-5.6-terra';
const HASS_LUNA_MODEL_ID = 'hass/gpt-5.6-luna';
const MHOO_MODEL_ID = 'mhoo/gpt-5.6-terra';

const createModel = (modelId: string): RegisteredAiModel => ({
  modelId,
  sdkPackage: '@ai-sdk/openai',
  model: {} as RegisteredAiModel['model'],
});

describe('AiModelRegistryService workspace defaults', () => {
  const preferencesService = {
    getPreferences: jest.fn(() => ({
      defaultFastModels: [MHOO_MODEL_ID, HASS_MODEL_ID],
      defaultSmartModels: [MHOO_MODEL_ID, HASS_MODEL_ID],
      recommendedModels: [],
    })),
    getRecommendedModelIds: jest.fn(() => new Set<string>()),
  };

  const createRegistry = () => {
    const registry = new AiModelRegistryService(
      { getResolvedProviders: jest.fn() } as never,
      { clearCache: jest.fn() } as never,
      preferencesService as never,
      { computeHash: jest.fn(() => 'stable') } as never,
    );
    const privateRegistry = registry as unknown as {
      currentConfigHash: string | null;
      modelRegistry: Map<string, RegisteredAiModel>;
      modelConfigCache: Map<string, { modelId: string }>;
    };

    privateRegistry.currentConfigHash = 'stable';
    privateRegistry.modelRegistry = new Map([
      [MHOO_MODEL_ID, createModel(MHOO_MODEL_ID)],
      [HASS_MODEL_ID, createModel(HASS_MODEL_ID)],
      [HASS_LUNA_MODEL_ID, createModel(HASS_LUNA_MODEL_ID)],
    ]);
    privateRegistry.modelConfigCache = new Map([
      [MHOO_MODEL_ID, { modelId: MHOO_MODEL_ID }],
      [HASS_MODEL_ID, { modelId: HASS_MODEL_ID }],
      [HASS_LUNA_MODEL_ID, { modelId: HASS_LUNA_MODEL_ID }],
    ]);

    return registry;
  };

  it('resolves auto-selected fast models from the requesting workspace only', () => {
    const registry = createRegistry();

    const hassModel = registry.resolveModelForAgent(
      { modelId: AUTO_SELECT_FAST_MODEL_ID },
      {
        useRecommendedModels: false,
        enabledAiModelIds: [HASS_MODEL_ID],
      },
    );
    const mhooModel = registry.resolveModelForAgent(
      { modelId: AUTO_SELECT_FAST_MODEL_ID },
      {
        useRecommendedModels: false,
        enabledAiModelIds: [MHOO_MODEL_ID],
      },
    );

    expect(hassModel.modelId).toBe(HASS_MODEL_ID);
    expect(mhooModel.modelId).toBe(MHOO_MODEL_ID);
  });

  it('honors an explicit workspace fast model when multiple models are enabled', () => {
    const registry = createRegistry();
    const hassWorkspace = {
      fastModel: HASS_LUNA_MODEL_ID,
      useRecommendedModels: false,
      enabledAiModelIds: [HASS_MODEL_ID, HASS_LUNA_MODEL_ID],
    };

    registry.validateModelAvailability(hassWorkspace.fastModel, hassWorkspace);

    expect(
      registry.resolveModelForAgent(
        { modelId: hassWorkspace.fastModel },
        hassWorkspace,
      ).modelId,
    ).toBe(HASS_LUNA_MODEL_ID);
  });

  it('rejects a workspace fast model that is not enabled', () => {
    const registry = createRegistry();

    expect(() =>
      registry.validateModelAvailability(HASS_LUNA_MODEL_ID, {
        useRecommendedModels: false,
        enabledAiModelIds: [HASS_MODEL_ID],
      }),
    ).toThrow('not available in this workspace');
  });
});
