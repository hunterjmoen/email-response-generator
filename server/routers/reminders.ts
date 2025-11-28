import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import type { ClientRow } from '../../types/database';
import { logError } from '../../utils/logger';

// Default follow-up intervals by priority (in days)
const DEFAULT_INTERVALS = {
  high: 3,
  medium: 7,
  low: 14,
};

export const remindersRouter = router({
  /**
   * Get list of clients needing follow-up
   * Returns clients where:
   * - follow_up_enabled = true
   * - last_contact_date + interval < now
   * - not reminded in last 24 hours
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Fetch all clients with follow-ups enabled
      const { data, error } = await ctx.supabase
        .from('clients')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('follow_up_enabled', true)
        .eq('is_archived', false)
        .order('last_contact_date', { ascending: true, nullsFirst: false });

      if (error) {
        logError(error, { context: 'Fetch follow-up reminders' });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch reminders',
        });
      }

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Filter clients that need follow-up
      const needsFollowUp = (data as ClientRow[] || []).filter((client) => {
        // Skip if reminded in last 24 hours
        if (client.last_reminded_at) {
          const lastReminded = new Date(client.last_reminded_at);
          if (lastReminded > oneDayAgo) {
            return false;
          }
        }

        // Determine interval
        const interval = client.follow_up_interval_days ||
          DEFAULT_INTERVALS[client.priority as keyof typeof DEFAULT_INTERVALS] ||
          7;

        // Calculate when follow-up is due
        const lastContact = client.last_contact_date
          ? new Date(client.last_contact_date)
          : new Date(client.created_at);

        const daysSinceContact = Math.floor(
          (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
        );

        return daysSinceContact >= interval;
      });

      // Transform to camelCase and add calculated fields
      const reminders = needsFollowUp.map((row) => {
        const lastContact = row.last_contact_date
          ? new Date(row.last_contact_date)
          : new Date(row.created_at);

        const daysSinceContact = Math.floor(
          (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
        );

        const interval = row.follow_up_interval_days ||
          DEFAULT_INTERVALS[row.priority as keyof typeof DEFAULT_INTERVALS] ||
          7;

        return {
          id: row.id,
          name: row.name,
          email: row.email,
          company: row.company,
          relationshipStage: row.relationship_stage,
          priority: row.priority || 'medium',
          lastContactDate: row.last_contact_date || row.created_at,
          daysSinceContact,
          followUpInterval: interval,
          healthScore: row.health_score || 50,
        };
      });

      return {
        reminders,
        count: reminders.length,
      };
    } catch (error) {
      logError(error, { context: 'List reminders' });
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
   * Dismiss a follow-up reminder
   * Updates last_reminded_at to suppress the reminder for 24 hours
   */
  dismiss: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { error } = await ctx.supabase
          .from('clients')
          .update({ last_reminded_at: new Date().toISOString() })
          .eq('id', input.clientId)
          .eq('user_id', ctx.user.id);

        if (error) {
          logError(error, { context: 'Dismiss reminder' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to dismiss reminder',
          });
        }

        return { success: true };
      } catch (error) {
        logError(error, { context: 'Dismiss reminder' });
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
   * Snooze a follow-up reminder for X days
   * Sets last_reminded_at to (now - interval + snoozeDays)
   * This makes the reminder reappear after snoozeDays
   */
  snooze: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        days: z.number().min(1).max(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch client to get interval
        const { data: client, error: fetchError } = await ctx.supabase
          .from('clients')
          .select('follow_up_interval_days, priority')
          .eq('id', input.clientId)
          .eq('user_id', ctx.user.id)
          .single();

        if (fetchError || !client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Client not found',
          });
        }

        // Calculate snooze timestamp
        // Set last_reminded_at so that the reminder appears after snoozeDays
        const interval = client.follow_up_interval_days ||
          DEFAULT_INTERVALS[client.priority as keyof typeof DEFAULT_INTERVALS] ||
          7;

        const now = new Date();
        const snoozeUntil = new Date(now.getTime() - (interval - input.days) * 24 * 60 * 60 * 1000);

        const { error } = await ctx.supabase
          .from('clients')
          .update({ last_reminded_at: snoozeUntil.toISOString() })
          .eq('id', input.clientId)
          .eq('user_id', ctx.user.id);

        if (error) {
          logError(error, { context: 'Snooze reminder' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to snooze reminder',
          });
        }

        return { success: true, snoozedUntil: new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000).toISOString() };
      } catch (error) {
        logError(error, { context: 'Snooze reminder' });
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
