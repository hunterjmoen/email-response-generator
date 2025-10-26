import { z } from 'zod';

// Context validation schema
export const ResponseContextSchema = z.object({
  relationshipStage: z.enum(['new', 'established', 'difficult', 'long_term']),
  projectPhase: z.enum(['discovery', 'active', 'completion', 'maintenance', 'on_hold']),
  urgency: z.enum(['immediate', 'standard', 'non_urgent']),
  messageType: z.enum(['update', 'question', 'concern', 'deliverable', 'payment', 'scope_change']),
  customNotes: z.string().optional(),
  clientName: z.string().optional(),
  userName: z.string().optional(),
});

// Message input validation
export const MessageInputSchema = z.object({
  originalMessage: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message cannot exceed 2000 characters')
    .trim(),
  context: ResponseContextSchema,
  templateId: z.string().uuid().optional(),
  refinementInstructions: z.string().max(500).optional(),
});

// Response feedback validation
export const ResponseFeedbackSchema = z.object({
  historyId: z.string().uuid(),
  selectedResponse: z.number().int().min(0).max(2),
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(1000).optional(),
});

// AI Response Options validation
export const AIResponseOptionsSchema = z.object({
  content: z.string().min(1),
  tone: z.enum(['professional', 'casual', 'formal']),
  length: z.enum(['brief', 'standard', 'detailed']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

// Full AI Response validation
export const AIResponseSchema = z.object({
  id: z.string().uuid(),
  options: z.array(AIResponseOptionsSchema).min(1).max(3),
  originalMessage: z.string(),
  context: ResponseContextSchema,
  historyId: z.string().uuid(),
  model: z.string(),
  generatedAt: z.string().datetime(),
  cost: z.number().positive().optional(),
});

// Export types inferred from schemas
export type ValidatedMessageInput = z.infer<typeof MessageInputSchema>;
export type ValidatedResponseFeedback = z.infer<typeof ResponseFeedbackSchema>;
export type ValidatedAIResponse = z.infer<typeof AIResponseSchema>;