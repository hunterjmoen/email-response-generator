# API Specification

Based on our chosen tRPC approach for end-to-end TypeScript safety, here are the router definitions for FreelanceFlow's API:

## tRPC Router Definitions

```typescript
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './trpc';

// Input validation schemas
const ResponseContextSchema = z.object({
  relationshipStage: z.enum(['new', 'established', 'difficult', 'long_term']),
  projectPhase: z.enum(['discovery', 'active', 'completion', 'maintenance', 'on_hold']),
  urgency: z.enum(['immediate', 'standard', 'non_urgent']),
  messageType: z.enum(['update', 'question', 'concern', 'deliverable', 'payment', 'scope_change']),
  customNotes: z.string().optional(),
});

const GenerateResponseSchema = z.object({
  originalMessage: z.string().min(10).max(2000),
  context: ResponseContextSchema,
  templateId: z.string().optional(),
  refinementInstructions: z.string().optional(),
});

// Main application router
export const appRouter = router({
  // Authentication & User Management
  auth: router({
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        industry: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Supabase Auth integration
        // Returns: { user: User, session: Session }
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Returns: { user: User, session: Session }
      }),
  }),

  // User Profile Management
  user: router({
    getProfile: protectedProcedure
      .query(async ({ ctx }) => {
        // Returns: User profile
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        industry: z.string().optional(),
        communicationStyle: z.object({
          formality: z.enum(['casual', 'professional', 'formal']).optional(),
          tone: z.enum(['friendly', 'neutral', 'direct']).optional(),
          length: z.enum(['brief', 'standard', 'detailed']).optional(),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Returns: Updated User
      }),

    exportData: protectedProcedure
      .mutation(async ({ ctx }) => {
        // GDPR compliance - export all user data
      }),

    deleteAccount: protectedProcedure
      .input(z.object({ confirmation: z.literal('DELETE') }))
      .mutation(async ({ input, ctx }) => {
        // GDPR compliance - complete account deletion
      }),
  }),

  // Core AI Response Generation
  responses: router({
    generate: protectedProcedure
      .input(GenerateResponseSchema)
      .mutation(async ({ input, ctx }) => {
        // 1. Check usage limits
        // 2. Call OpenAI API with context
        // 3. Generate 2-3 response variants
        // 4. Save to ResponseHistory
        // Returns: { responses: AIResponse[], historyId: string }
      }),

    getHistory: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        searchQuery: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Returns: { responses: ResponseHistory[], total: number }
      }),
  }),

  // Template Management
  templates: router({
    getSystemTemplates: protectedProcedure
      .query(async ({ ctx }) => {
        // Returns: Template[] (system templates only)
      }),

    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        category: z.enum(['project_updates', 'scope_discussions', 'payment_reminders', 'timeline_changes', 'deliverables', 'custom']),
        description: z.string().max(500),
        defaultContext: ResponseContextSchema,
        promptTemplate: z.string().min(10).max(1000),
      }))
      .mutation(async ({ input, ctx }) => {
        // Returns: Created Template
      }),
  }),

  // Subscription & Billing
  subscription: router({
    getStatus: protectedProcedure
      .query(async ({ ctx }) => {
        // Returns: Current subscription status and usage
      }),

    createCheckoutSession: protectedProcedure
      .input(z.object({
        priceId: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Create Stripe checkout session
        // Returns: { sessionUrl: string }
      }),
  }),
});

export type AppRouter = typeof appRouter;
```
