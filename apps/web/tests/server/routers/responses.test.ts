import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { responsesRouter } from '../../../src/server/routers/responses';
import { AIResponseService } from '../../../src/services/ai-response';
import type { Context } from '../../../src/server/trpc';
import type { User } from '@freelance-flow/shared';

// Mock dependencies
vi.mock('../../../src/services/ai-response');
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      range: vi.fn(),
      order: vi.fn().mockReturnThis(),
    })),
  })),
}));

const mockAIResponseService = vi.mocked(AIResponseService);

// Helper to call tRPC procedures
const createCaller = (ctx: Context) => {
  return responsesRouter.createCaller(ctx);
};

describe('responses router', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    industry: 'technology',
    communicationStyle: {
      formality: 'professional',
      tone: 'neutral',
      length: 'standard',
    },
    subscription: {
      tier: 'free',
      status: 'active',
      usageCount: 5,
      billingCycle: '2024-12-31T23:59:59Z',
    },
    preferences: {
      defaultContext: {
        relationshipStage: 'established',
        projectPhase: 'active',
        urgency: 'standard',
        messageType: 'update',
      },
      emailNotifications: true,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockContext: Context = {
    user: mockUser,
  };

  const mockSubscription = {
    usage_count: 5,
    monthly_limit: 100,
    tier: 'free',
  };

  const mockAIResponses = [
    {
      content: 'Thank you for your message. I will address this right away.',
      tone: 'professional' as const,
      length: 'standard' as const,
      confidence: 0.9,
      reasoning: 'Professional response',
    },
    {
      content: 'Thanks for reaching out! I can help with that.',
      tone: 'casual' as const,
      length: 'brief' as const,
      confidence: 0.85,
      reasoning: 'Casual friendly response',
    },
  ];

  let mockSupabaseChain: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mock chain for Supabase operations
    mockSupabaseChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      range: vi.fn(),
      order: vi.fn().mockReturnThis(),
    };

    // Mock Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => mockSupabaseChain),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generate', () => {
    it('generates responses successfully', async () => {
      const caller = responsesRouter.createCaller(mockContext);

      // Mock subscription check
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: mockSubscription,
        error: null,
      });

      // Mock AI service
      mockAIResponseService.generateResponses.mockResolvedValue(mockAIResponses);
      mockAIResponseService.estimateCost.mockReturnValue(50);

      // Mock response history insertion
      const mockResponseHistory = {
        id: 'history-123',
        user_id: mockUser.id,
        original_message: 'Test message',
        context: {
          urgency: 'standard',
          messageType: 'update',
          relationshipStage: 'established',
          projectPhase: 'active',
        },
        generated_options: mockAIResponses,
        openai_model: 'gpt-4',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseChain.single.mockResolvedValueOnce({
        data: mockResponseHistory,
        error: null,
      });

      // Mock usage count update
      mockSupabaseChain.update.mockResolvedValueOnce({
        data: { usage_count: 6 },
        error: null,
      });

      const result = await caller.generate({
        originalMessage: 'Test message for response generation',
        context: {
          urgency: 'standard',
          messageType: 'update',
          relationshipStage: 'established',
          projectPhase: 'active',
        },
      });

      expect(result).toEqual({
        response: {
          id: 'history-123',
          options: mockAIResponses,
          originalMessage: 'Test message for response generation',
          context: {
            urgency: 'standard',
            messageType: 'update',
            relationshipStage: 'established',
            projectPhase: 'active',
          },
          historyId: 'history-123',
          model: 'gpt-4',
          generatedAt: '2024-01-01T00:00:00Z',
          cost: 50,
        },
        historyId: 'history-123',
      });

      expect(mockAIResponseService.generateResponses).toHaveBeenCalledWith(
        'Test message for response generation',
        {
          urgency: 'standard',
          messageType: 'update',
          relationshipStage: 'established',
          projectPhase: 'active',
        }
      );
    });

    it('throws error when subscription not found', async () => {
      const caller = createCaller(mockContext);

      // Mock subscription check failure
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        caller.generate({
          originalMessage: 'Test message',
          context: {
            urgency: 'standard',
            messageType: 'update',
            relationshipStage: 'established',
            projectPhase: 'active',
          },
        })
      ).rejects.toThrow('Subscription not found');
    });

    it('throws error when usage limit exceeded', async () => {
      const caller = createCaller(mockContext);

      // Mock subscription with exceeded usage
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          ...mockSubscription,
          usage_count: 100,
          monthly_limit: 100,
        },
        error: null,
      });

      await expect(
        caller.generate({
          originalMessage: 'Test message',
          context: {
            urgency: 'standard',
            messageType: 'update',
            relationshipStage: 'established',
            projectPhase: 'active',
          },
        })
      ).rejects.toThrow('Monthly usage limit exceeded');
    });

    it('handles AI service errors', async () => {
      const caller = createCaller(mockContext);

      // Mock successful subscription check
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: mockSubscription,
        error: null,
      });

      // Mock AI service error
      mockAIResponseService.generateResponses.mockRejectedValue(
        new Error('OpenAI API error')
      );

      await expect(
        caller.generate({
          originalMessage: 'Test message',
          context: {
            urgency: 'standard',
            messageType: 'update',
            relationshipStage: 'established',
            projectPhase: 'active',
          },
        })
      ).rejects.toThrow('OpenAI API error');
    });

    it('validates input correctly', async () => {
      const caller = createCaller(mockContext);

      // Test message too short
      await expect(
        caller.generate({
          originalMessage: 'Short',
          context: {
            urgency: 'standard',
            messageType: 'update',
            relationshipStage: 'established',
            projectPhase: 'active',
          },
        })
      ).rejects.toThrow();

      // Test message too long
      const longMessage = 'a'.repeat(2001);
      await expect(
        caller.generate({
          originalMessage: longMessage,
          context: {
            urgency: 'standard',
            messageType: 'update',
            relationshipStage: 'established',
            projectPhase: 'active',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('submitFeedback', () => {
    it('submits feedback successfully', async () => {
      const caller = createCaller(mockContext);

      const mockUpdatedHistory = {
        id: 'history-123',
        selected_response: 1,
        user_rating: 4,
        user_feedback: 'Great response!',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseChain.single.mockResolvedValueOnce({
        data: mockUpdatedHistory,
        error: null,
      });

      const result = await caller.submitFeedback({
        historyId: 'history-123',
        selectedResponse: 1,
        rating: 4,
        feedback: 'Great response!',
      });

      expect(result).toEqual({
        success: true,
        updated: mockUpdatedHistory,
      });
    });

    it('throws error for non-existent history', async () => {
      const caller = createCaller(mockContext);

      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        caller.submitFeedback({
          historyId: 'non-existent',
          selectedResponse: 0,
        })
      ).rejects.toThrow('Response history not found or access denied');
    });

    it('validates feedback input', async () => {
      const caller = createCaller(mockContext);

      // Test invalid selectedResponse index
      await expect(
        caller.submitFeedback({
          historyId: 'history-123',
          selectedResponse: -1, // Invalid index
        })
      ).rejects.toThrow();

      // Test invalid rating
      await expect(
        caller.submitFeedback({
          historyId: 'history-123',
          selectedResponse: 0,
          rating: 6, // Rating should be 1-5
        })
      ).rejects.toThrow();
    });
  });

  describe('getHistory', () => {
    it('retrieves user history successfully', async () => {
      const caller = createCaller(mockContext);

      const mockHistory = [
        {
          id: 'history-1',
          user_id: mockUser.id,
          original_message: 'First message',
          context: { urgency: 'standard' },
          generated_options: mockAIResponses,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'history-2',
          user_id: mockUser.id,
          original_message: 'Second message',
          context: { urgency: 'immediate' },
          generated_options: mockAIResponses,
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockSupabaseChain.range = vi.fn().mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      const result = await caller.getHistory({
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockHistory);
    });

    it('applies pagination correctly', async () => {
      const caller = createCaller(mockContext);

      mockSupabaseChain.range = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      await caller.getHistory({
        limit: 5,
        offset: 10,
      });

      expect(mockSupabaseChain.range).toHaveBeenCalledWith(10, 14); // offset to offset + limit - 1
    });

    it('validates pagination parameters', async () => {
      const caller = createCaller(mockContext);

      // Test invalid limit
      await expect(
        caller.getHistory({
          limit: 0,
          offset: 0,
        })
      ).rejects.toThrow();

      // Test limit too high
      await expect(
        caller.getHistory({
          limit: 51,
          offset: 0,
        })
      ).rejects.toThrow();

      // Test negative offset
      await expect(
        caller.getHistory({
          limit: 10,
          offset: -1,
        })
      ).rejects.toThrow();
    });
  });

  describe('regenerate', () => {
    it('regenerates responses with refinement', async () => {
      const caller = createCaller(mockContext);

      // Mock original history fetch
      const mockOriginalHistory = {
        id: 'history-123',
        user_id: mockUser.id,
        original_message: 'Original message',
        context: {
          urgency: 'standard',
          messageType: 'update',
          relationshipStage: 'established',
          projectPhase: 'active',
        },
        generated_options: mockAIResponses,
        refinement_count: 0,
      };

      mockSupabaseChain.single
        .mockResolvedValueOnce({
          data: mockOriginalHistory,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockSubscription,
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            ...mockOriginalHistory,
            generated_options: [mockAIResponses[0]], // Refined response
            refinement_count: 1,
            updated_at: '2024-01-01T01:00:00Z',
          },
          error: null,
        });

      // Mock AI service refinement
      mockAIResponseService.regenerateWithRefinement.mockResolvedValue([
        mockAIResponses[0],
      ]);

      const result = await caller.regenerate({
        historyId: 'history-123',
        refinementInstructions: 'Make it more concise',
      });

      expect(result.response.options).toHaveLength(1);
      expect(mockAIResponseService.regenerateWithRefinement).toHaveBeenCalledWith(
        'Original message',
        mockOriginalHistory.context,
        mockAIResponses,
        'Make it more concise'
      );
    });

    it('throws error for non-existent history', async () => {
      const caller = createCaller(mockContext);

      mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(
        caller.regenerate({
          historyId: 'non-existent',
          refinementInstructions: 'Make it better',
        })
      ).rejects.toThrow('Original response not found');
    });

    it('validates refinement instructions length', async () => {
      const caller = createCaller(mockContext);

      // Test refinement instructions too short
      await expect(
        caller.regenerate({
          historyId: 'history-123',
          refinementInstructions: 'Short', // Less than 10 characters
        })
      ).rejects.toThrow();

      // Test refinement instructions too long
      const longInstructions = 'a'.repeat(501);
      await expect(
        caller.regenerate({
          historyId: 'history-123',
          refinementInstructions: longInstructions,
        })
      ).rejects.toThrow();
    });
  });
});