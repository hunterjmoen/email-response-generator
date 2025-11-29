import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import type { FollowUpTemplateRow } from '../../types/database';
import { logError } from '../../utils/logger';

export const templatesRouter = router({
  /**
   * Get all active follow-up templates
   * Optional filtering by category
   */
  list: protectedProcedure
    .input(
      z
        .object({
          category: z
            .enum([
              'general_checkin',
              'project_update',
              'payment_reminder',
              'proposal_followup',
              'reengagement',
            ])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        let query = ctx.supabase
          .from('follow_up_templates')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        // Filter by category if provided
        if (input?.category) {
          query = query.eq('category', input.category);
        }

        const { data, error } = await query;

        if (error) {
          logError(error, { context: 'Fetch follow-up templates' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch templates',
          });
        }

        // Transform to camelCase
        const templates = (data as FollowUpTemplateRow[] || []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          messageTemplate: row.message_template,
          category: row.category,
          sortOrder: row.sort_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        return {
          templates,
          count: templates.length,
        };
      } catch (error) {
        logError(error, { context: 'List templates' });
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get a specific template by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('follow_up_templates')
          .select('*')
          .eq('id', input.id)
          .eq('is_active', true)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Template not found',
            });
          }
          logError(error, { context: 'Fetch template by ID' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch template',
          });
        }

        const row = data as FollowUpTemplateRow;

        return {
          id: row.id,
          name: row.name,
          description: row.description,
          messageTemplate: row.message_template,
          category: row.category,
          sortOrder: row.sort_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      } catch (error) {
        logError(error, { context: 'Get template by ID' });
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),
});
