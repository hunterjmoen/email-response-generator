import { z } from 'zod';

// Context validation schema
export const ResponseContextSchema = z.object({
  relationshipStage: z.enum(['new', 'established', 'difficult', 'long_term']),
  projectPhase: z.enum(['discovery', 'active', 'completion', 'maintenance', 'on_hold']),
  urgency: z.enum(['immediate', 'standard', 'non_urgent']),
  messageType: z.enum(['update', 'question', 'concern', 'deliverable', 'payment', 'scope_change']),
  customNotes: z.string().optional(),
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

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    }),
});

export const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    }),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  industry: z.string().optional(),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const PasswordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    }),
});

// Export types inferred from schemas
export type ValidatedMessageInput = z.infer<typeof MessageInputSchema>;
export type ValidatedResponseFeedback = z.infer<typeof ResponseFeedbackSchema>;
export type ValidatedAIResponse = z.infer<typeof AIResponseSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>;