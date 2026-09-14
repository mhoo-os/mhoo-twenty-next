import { generateText } from 'ai';

import { AgentTurnGraderService } from 'src/engine/metadata-modules/ai/ai-agent-monitor/services/agent-turn-grader.service';

jest.mock('ai', () => ({ generateText: jest.fn() }));

describe('AgentTurnGraderService', () => {
  it.each([
    ['hass-workspace', 'hass/gpt-5.6-terra'],
    ['mhoo-workspace', 'mhoo/gpt-5.6-terra'],
  ])(
    'uses the %s provider when grading a background turn',
    async (workspaceId, modelId) => {
      const workspace = {
        id: workspaceId,
        fastModel: modelId,
        useRecommendedModels: false,
        enabledAiModelIds: [modelId],
      };
      const turn = {
        id: 'turn-id',
        workspaceId,
        agentId: 'agent-id',
        threadId: 'thread-id',
        messages: [],
      };
      const registry = {
        validateModelAvailability: jest.fn(),
        resolveModelForAgent: jest.fn(() => ({ modelId, model: {} })),
      };
      const evaluationRepository = {
        insertAndReturnOne: jest
          .fn()
          .mockImplementation((_workspaceId, value) => value),
      };

      jest.mocked(generateText).mockResolvedValue({
        text: '{"score": 95, "comment": "Good"}',
      } as never);

      const service = new AgentTurnGraderService(
        { findOne: jest.fn().mockResolvedValue(turn) } as never,
        evaluationRepository as never,
        registry as never,
        { findOneBy: jest.fn().mockResolvedValue(workspace) } as never,
      );

      await service.evaluateTurn({ turnId: turn.id, workspaceId });

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
    },
  );
});
