import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import { resend, FEEDBACK_RECIPIENT_EMAIL, FROM_EMAIL, isEmailConfigured } from '../lib/resend';
import { getFeedbackNotificationEmail } from '../emails/feedback-notification';
import { logError, devLog } from '../../utils/logger';
import type { Database } from '../../types/supabase';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SubmitFeedbackSchema = z.object({
  type: z.enum(['widget', 'trial_end', 'usage_milestone']).default('widget'),
  rating: z.number().min(1).max(5).optional(),
  category: z.enum(['bug', 'feature', 'general', 'praise']).optional(),
  message: z.string().min(10, 'Please provide at least 10 characters').max(2000),
  pageUrl: z.string().optional(),
});

export const feedbackRouter = router({
  submit: protectedProcedure
    .input(SubmitFeedbackSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. Store feedback in database
        const { data: feedback, error: dbError } = await supabaseAdmin
          .from('feedback')
          .insert({
            user_id: ctx.user.id,
            type: input.type,
            rating: input.rating,
            category: input.category,
            message: input.message,
            page_url: input.pageUrl,
            metadata: {
              subscriptionTier: ctx.user.subscription.tier,
              usageCount: ctx.user.subscription.usageCount,
            },
          })
          .select()
          .single();

        if (dbError) {
          logError(dbError, { context: 'Store feedback in database' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save feedback',
          });
        }

        devLog.log('[Feedback] Saved feedback to database:', feedback.id);

        // 2. Send email notification to owner (don't fail if email fails)
        if (isEmailConfigured() && resend) {
          try {
            const emailContent = getFeedbackNotificationEmail({
              userEmail: ctx.user.email,
              userName: `${ctx.user.firstName} ${ctx.user.lastName}`.trim(),
              category: input.category,
              rating: input.rating,
              message: input.message,
              pageUrl: input.pageUrl,
              subscriptionTier: ctx.user.subscription.tier,
              submittedAt: new Date().toLocaleString(),
            });

            await resend.emails.send({
              from: FROM_EMAIL,
              to: FEEDBACK_RECIPIENT_EMAIL,
              subject: emailContent.subject,
              html: emailContent.html,
            });

            devLog.log('[Feedback] Email sent to owner successfully');
          } catch (emailError) {
            logError(emailError, { context: 'Send feedback email to owner' });
            // Don't throw - feedback is saved, email is secondary
          }
        } else {
          devLog.log('[Feedback] Email not configured, skipping notification');
        }

        return { success: true, feedbackId: feedback.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logError(error, { context: 'Submit feedback' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit feedback',
        });
      }
    }),

  getMyFeedback: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await supabaseAdmin
        .from('feedback')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        logError(error, { context: 'Fetch user feedback history' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch feedback history',
        });
      }

      return data;
    }),
});
