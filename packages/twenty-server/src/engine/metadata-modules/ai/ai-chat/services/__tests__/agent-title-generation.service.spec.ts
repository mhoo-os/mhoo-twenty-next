import { generateText } from 'ai';

import { AgentTitleGenerationService } from 'src/engine/metadata-modules/ai/ai-chat/services/agent-title-generation.service';

jest.mock('ai', () => ({ generateText: jest.fn() }));

const HASS_WORKSPACE = {
  id: 'hass-workspace',
  fastModel: 'hass/gpt-5.6-terra',
  useRecommendedModels: false,
  enabledAiModelIds: ['hass/gpt-5.6-terra'],
};
const MHOO_WORKSPACE = {
  id: 'mhoo-workspace',
  fastModel: 'mhoo/gpt-5.6-terra',
  useRecommendedModels: false,
  enabledAiModelIds: ['mhoo/gpt-5.6-terra'],
};

describe('AgentTitleGenerationService', () => {
  beforeEach(() => {
    jest.mocked(generateText).mockResolvedValue({
      text: 'Generated title',
      usage: {},
      steps: [],
    } as never);
  });

  it.each([
    [HASS_WORKSPACE, 'hass/gpt-5.6-terra'],
    [MHOO_WORKSPACE, 'mhoo/gpt-5.6-terra'],
  ])(
    'uses the requesting workspace provider for %s',
    async (workspace, modelId) => {
      const registry = {
        validateModelAvailability: jest.fn(),
        resolveModelForAgent: jest.fn(() => ({
          modelId,
          model: {},
        })),
      };
      const billing = { calculateAndBillUsage: jest.fn() };
      const service = new AgentTitleGenerationService(
        registry as never,
        billing as never,
        { hasAvailableCreditsOrThrow: jest.fn() } as never,
        { findOneBy: jest.fn().mockResolvedValue(workspace) } as never,
      );

      await service.generateThreadTitle('A user message', workspace.id, null);

      expect(registry.validateModelAvailability).toHaveBeenCalledWith(
        workspace.fastModel,
        workspace,
      );
      expect(registry.resolveModelForAgent).toHaveBeenCalledWith(
        { modelId: workspace.fastModel },
        workspace,
      );
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({ model: {} }),
      );
      expect(billing.calculateAndBillUsage).toHaveBeenCalledWith(
        modelId,
        expect.anything(),
        workspace.id,
        expect.anything(),
        null,
        null,
      );
    },
  );

  it('falls back without resolving a model when the workspace is missing', async () => {
    const registry = {
      validateModelAvailability: jest.fn(),
      resolveModelForAgent: jest.fn(),
    };
    const service = new AgentTitleGenerationService(
      registry as never,
      { calculateAndBillUsage: jest.fn() } as never,
      { hasAvailableCreditsOrThrow: jest.fn() } as never,
      { findOneBy: jest.fn().mockResolvedValue(null) } as never,
    );

    await expect(
      service.generateThreadTitle('A user message', 'missing-workspace', null),
    ).resolves.toBe('A user message');
    expect(registry.resolveModelForAgent).not.toHaveBeenCalled();
  });
});
