import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIResponseService } from '../../src/services/ai-response';
import { type ResponseContext } from '@freelance-flow/shared';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

import OpenAI from 'openai';

const mockOpenAI = vi.mocked(OpenAI);
const mockCreate = vi.fn();

describe('AIResponseService', () => {
  const mockContext: ResponseContext = {
    urgency: 'standard',
    messageType: 'update',
    relationshipStage: 'established',
    projectPhase: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock OpenAI instance
    mockOpenAI.mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: mockCreate,
            },
          },
        } as any)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateResponses', () => {
    it('generates responses successfully', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responses: [
                  {
                    content: 'Thank you for your update. I will review this and get back to you.',
                    tone: 'professional',
                    length: 'standard',
                    confidence: 0.9,
                    reasoning: 'Professional response appropriate for business communication',
                  },
                  {
                    content: 'Thanks for the update! Let me look into this.',
                    tone: 'casual',
                    length: 'brief',
                    confidence: 0.85,
                    reasoning: 'Casual tone for friendly communication',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      const result = await AIResponseService.generateResponses(
        'Here is the project update you requested.',
        mockContext
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        content: 'Thank you for your update. I will review this and get back to you.',
        tone: 'professional',
        length: 'standard',
        confidence: 0.9,
        reasoning: 'Professional response appropriate for business communication',
      });
      expect(result[1]).toEqual({
        content: 'Thanks for the update! Let me look into this.',
        tone: 'casual',
        length: 'brief',
        confidence: 0.85,
        reasoning: 'Casual tone for friendly communication',
      });
    });

    it('calls OpenAI with correct parameters', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responses: [
                  {
                    content: 'Test response',
                    tone: 'professional',
                    length: 'standard',
                    confidence: 0.8,
                  },
                ],
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      await AIResponseService.generateResponses(
        'Test message for analysis',
        mockContext
      );

      expect(mockCreate).toHaveBeenCalledWith({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('expert freelancer communication assistant'),
          },
          {
            role: 'user',
            content: expect.stringContaining('Test message for analysis'),
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });
    });

    it('builds context description correctly', async () => {
      const urgentContext: ResponseContext = {
        urgency: 'immediate',
        messageType: 'concern',
        relationshipStage: 'difficult',
        projectPhase: 'on_hold',
        customNotes: 'Client is frustrated with delays',
      };

      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responses: [
                  {
                    content: 'Test response',
                    tone: 'professional',
                    length: 'standard',
                    confidence: 0.8,
                  },
                ],
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      await AIResponseService.generateResponses('Test message', urgentContext);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;

      expect(userMessage).toContain('urgent/immediate response');
      expect(userMessage).toContain('concern or issue');
      expect(userMessage).toContain('challenging client relationship');
      expect(userMessage).toContain('currently on hold');
      expect(userMessage).toContain('Client is frustrated with delays');
    });

    it('handles OpenAI API errors', async () => {
      const error = new Error('OpenAI API rate limit exceeded');
      mockCreate.mockRejectedValue(error);

      await expect(
        AIResponseService.generateResponses('Test message', mockContext)
      ).rejects.toThrow('AI response generation failed: OpenAI API rate limit exceeded');
    });

    it('handles invalid JSON response', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      await expect(
        AIResponseService.generateResponses('Test message', mockContext)
      ).rejects.toThrow('AI response generation failed');
    });

    it('handles empty response from OpenAI', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      await expect(
        AIResponseService.generateResponses('Test message', mockContext)
      ).rejects.toThrow('Empty response from OpenAI');
    });

    it('validates response format', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responses: [
                  {
                    // Missing required content field
                    tone: 'professional',
                    length: 'standard',
                    confidence: 0.8,
                  },
                ],
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      await expect(
        AIResponseService.generateResponses('Test message', mockContext)
      ).rejects.toThrow('Invalid response content at index 0');
    });

    it('applies default values for missing optional fields', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responses: [
                  {
                    content: 'Test response',
                    // Missing optional fields
                  },
                ],
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      const result = await AIResponseService.generateResponses(
        'Test message',
        mockContext
      );

      expect(result[0]).toEqual({
        content: 'Test response',
        tone: 'professional', // default
        length: 'standard', // default
        confidence: 0.8, // default
        reasoning: 'AI-generated response', // default
      });
    });
  });

  describe('estimateCost', () => {
    it('calculates cost based on message length', () => {
      const cost = AIResponseService.estimateCost(100, 3);
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThan(0);
    });

    it('scales cost with message length', () => {
      const shortCost = AIResponseService.estimateCost(50, 3);
      const longCost = AIResponseService.estimateCost(200, 3);
      expect(longCost).toBeGreaterThan(shortCost);
    });

    it('scales cost with response count', () => {
      const fewResponsesCost = AIResponseService.estimateCost(100, 2);
      const manyResponsesCost = AIResponseService.estimateCost(100, 4);
      expect(manyResponsesCost).toBeGreaterThan(fewResponsesCost);
    });
  });

  describe('regenerateWithRefinement', () => {
    it('regenerates responses with refinement instructions', async () => {
      const previousResponses = [
        {
          content: 'Original response',
          tone: 'professional' as const,
          length: 'standard' as const,
          confidence: 0.8,
        },
      ];

      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responses: [
                  {
                    content: 'Refined response with more details',
                    tone: 'professional',
                    length: 'detailed',
                    confidence: 0.9,
                    reasoning: 'Refined based on user feedback',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      const result = await AIResponseService.regenerateWithRefinement(
        'Original message',
        mockContext,
        previousResponses,
        'Make it more detailed and specific'
      );

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Refined response with more details');
      expect(result[0].length).toBe('detailed');

      // Verify the prompt includes refinement instructions
      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;
      expect(userMessage).toContain('PREVIOUS RESPONSES:');
      expect(userMessage).toContain('Original response');
      expect(userMessage).toContain('REFINEMENT INSTRUCTIONS:');
      expect(userMessage).toContain('Make it more detailed and specific');
    });

    it('uses higher temperature for refinement', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                responses: [
                  {
                    content: 'Refined response',
                    tone: 'professional',
                    length: 'standard',
                    confidence: 0.8,
                  },
                ],
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockOpenAIResponse);

      await AIResponseService.regenerateWithRefinement(
        'Test message',
        mockContext,
        [],
        'Refinement instructions'
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8, // Higher than the normal 0.7
        })
      );
    });
  });
});