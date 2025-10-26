import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import { AIResponseService } from '../../services/ai-response';
import {
  MessageInputSchema,
  ResponseFeedbackSchema,
  type AIResponse,
  type AIResponseOptions,
  type ResponseHistory,
} from '@freelance-flow/shared';

// Create server-side Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to calculate average confidence
function calculateAverageConfidence(responses: AIResponseOptions[]): number {
  if (!responses.length) return 0;
  const sum = responses.reduce((acc, response) => acc + response.confidence, 0);
  return Math.round((sum / responses.length) * 100) / 100;
}

export const responsesRouter = router({
  /**
   * Generate AI response options
   */
  generate: protectedProcedure
    .input(MessageInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { originalMessage, context, templateId, refinementInstructions } = input;
      const { user } = ctx;

      try {
        // Fetch full user profile including style_profile
        const { data: userProfile, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError || !userProfile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User profile not found',
          });
        }

        // Check user's usage limits
        const { data: subscription } = await supabaseAdmin
          .from('subscriptions')
          .select('usage_count, monthly_limit, tier')
          .eq('user_id', user.id)
          .single();

        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Subscription not found',
          });
        }

        if (subscription.usage_count >= subscription.monthly_limit) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Monthly usage limit exceeded',
          });
        }

        // Add user's name to context for signature
        const enrichedContext = {
          ...context,
          userName: userProfile.first_name,
        };

        // Generate AI responses with style profile
        const aiResponses = await AIResponseService.generateResponses(
          originalMessage,
          enrichedContext,
          userProfile.style_profile
        );

        // Estimate cost
        const estimatedCost = AIResponseService.estimateCost(originalMessage.length);

        // Save to response_history table
        const { data: responseHistory, error: historyError } = await supabaseAdmin
          .from('response_history')
          .insert({
            user_id: user.id,
            original_message: originalMessage,
            context: enrichedContext,
            generated_options: aiResponses,
            template_used: templateId || null,
            refinement_instructions: refinementInstructions || null,
            openai_model: process.env.OPENAI_MODEL || 'gpt-4',
            generation_cost_cents: estimatedCost,
            confidence_score: calculateAverageConfidence(aiResponses),
            refinement_count: refinementInstructions ? 1 : 0,
          })
          .select()
          .single();

        if (historyError || !responseHistory) {
          console.error('Error saving response history:', historyError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save response history',
          });
        }

        // Update usage count
        await supabaseAdmin
          .from('subscriptions')
          .update({ usage_count: subscription.usage_count + 1 })
          .eq('user_id', user.id);

        // Prepare response
        const response: AIResponse = {
          id: responseHistory.id,
          options: aiResponses,
          originalMessage,
          context: enrichedContext,
          historyId: responseHistory.id,
          model: responseHistory.openai_model,
          generatedAt: responseHistory.created_at,
          cost: estimatedCost,
        };

        return {
          response,
          historyId: responseHistory.id,
        };
      } catch (error: any) {
        console.error('Response generation error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate responses',
        });
      }
    }),

  /**
   * Submit user feedback on generated responses
   */
  submitFeedback: protectedProcedure
    .input(ResponseFeedbackSchema)
    .mutation(async ({ input, ctx }) => {
      const { historyId, selectedResponse, rating, feedback } = input;
      const { user } = ctx;

      try {
        const { data: updated, error } = await supabaseAdmin
          .from('response_history')
          .update({
            selected_response: selectedResponse,
            user_rating: rating,
            user_feedback: feedback,
            updated_at: new Date().toISOString(),
          })
          .eq('id', historyId)
          .eq('user_id', user.id) // Ensure user can only update their own records
          .select()
          .single();

        if (error || !updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Response history not found or access denied',
          });
        }

        return { success: true, updated };
      } catch (error: any) {
        console.error('Feedback submission error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit feedback',
        });
      }
    }),

  /**
   * Get user's response history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, offset } = input;
      const { user } = ctx;

      try {
        const { data: history, error } = await supabaseAdmin
          .from('response_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch response history',
          });
        }

        return history as ResponseHistory[];
      } catch (error: any) {
        console.error('History fetch error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch history',
        });
      }
    }),

  /**
   * Regenerate responses with refinement
   */
  regenerate: protectedProcedure
    .input(
      z.object({
        historyId: z.string().uuid(),
        refinementInstructions: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { historyId, refinementInstructions } = input;
      const { user } = ctx;

      try {
        // Fetch full user profile including style_profile
        const { data: userProfile, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError || !userProfile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User profile not found',
          });
        }

        // Get the original response history
        const { data: original, error: fetchError } = await supabaseAdmin
          .from('response_history')
          .select('*')
          .eq('id', historyId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !original) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Original response not found',
          });
        }

        // Check usage limits
        const { data: subscription } = await supabaseAdmin
          .from('subscriptions')
          .select('usage_count, monthly_limit')
          .eq('user_id', user.id)
          .single();

        if (!subscription || subscription.usage_count >= subscription.monthly_limit) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Monthly usage limit exceeded',
          });
        }

        // Add user's name to context for signature
        const enrichedContext = {
          ...original.context,
          userName: userProfile.first_name,
        };

        // Generate refined responses with style profile
        const refinedResponses = await AIResponseService.regenerateWithRefinement(
          original.original_message,
          enrichedContext,
          original.generated_options,
          refinementInstructions,
          userProfile.style_profile
        );

        // Update the response history with refined responses
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('response_history')
          .update({
            generated_options: refinedResponses,
            refinement_count: (original.refinement_count || 0) + 1,
            refinement_instructions: refinementInstructions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', historyId)
          .select()
          .single();

        if (updateError || !updated) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save refined responses',
          });
        }

        // Update usage count
        await supabaseAdmin
          .from('subscriptions')
          .update({ usage_count: subscription.usage_count + 1 })
          .eq('user_id', user.id);

        const response: AIResponse = {
          id: updated.id,
          options: refinedResponses,
          originalMessage: updated.original_message,
          context: updated.context,
          historyId: updated.id,
          model: updated.openai_model,
          generatedAt: updated.updated_at,
        };

        return {
          response,
          historyId: updated.id,
        };
      } catch (error: any) {
        console.error('Regeneration error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to regenerate responses',
        });
      }
    }),

});