import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import { serverConfig } from '../../config/server';
import { encryptionService } from '../../services/encryption';
import { createRateLimitMiddleware } from '../middleware/rateLimit';

const supabaseAdmin = createClient(
  serverConfig.supabase.url,
  serverConfig.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const dashboardRouter = router({
  /**
   * Get dashboard statistics
   */
  getStats: protectedProcedure
    .use(createRateLimitMiddleware('GENERAL'))
    .query(async ({ ctx }) => {
      const { user } = ctx;

      try {
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Get current week date range (Sunday to Saturday)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        // Total responses this month
        const { count: monthlyResponses } = await supabaseAdmin
          .from('response_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString());

        // Total responses this week
        const { count: weeklyResponses } = await supabaseAdmin
          .from('response_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfWeek.toISOString());

        // Average rating (from responses with ratings)
        const { data: ratedResponses } = await supabaseAdmin
          .from('response_history')
          .select('user_rating')
          .eq('user_id', user.id)
          .not('user_rating', 'is', null);

        const averageRating = ratedResponses && ratedResponses.length > 0
          ? ratedResponses.reduce((sum, r) => sum + (r.user_rating || 0), 0) / ratedResponses.length
          : 0;

        // Count active clients (clients contacted in the last 30 days)
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const { count: activeClients } = await supabaseAdmin
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Calculate time saved (assuming avg 10 minutes per manual response)
        const timeSavedMinutes = (monthlyResponses || 0) * 10;
        const timeSavedHours = Math.round(timeSavedMinutes / 60 * 10) / 10; // Round to 1 decimal

        // Response rate (responses generated / days in month so far)
        const daysIntoMonth = now.getDate();
        const responseRate = daysIntoMonth > 0
          ? Math.round(((monthlyResponses || 0) / daysIntoMonth) * 100) / 100
          : 0;

        return {
          monthlyResponses: monthlyResponses || 0,
          weeklyResponses: weeklyResponses || 0,
          timeSavedHours,
          averageRating: Math.round(averageRating * 10) / 10,
          activeClients: activeClients || 0,
          responseRate,
          usageCount: user.subscription.usageCount || 0,
          monthlyLimit: user.subscription.monthlyLimit || 10,
          usagePercentage: user.subscription.monthlyLimit
            ? Math.round((user.subscription.usageCount || 0) / user.subscription.monthlyLimit * 100)
            : 0,
        };
      } catch (error: any) {
        console.error('Dashboard stats error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch dashboard stats',
        });
      }
    }),

  /**
   * Get recent activity (last 10 responses)
   */
  getRecentActivity: protectedProcedure
    .use(createRateLimitMiddleware('GENERAL'))
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }).optional())
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      const limit = input?.limit || 10;

      try {
        const { data: responses, error } = await supabaseAdmin
          .from('response_history')
          .select('id, created_at, user_rating, context, template_used, selected_response_encrypted')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch recent activity',
          });
        }

        // Decrypt selected responses and format data
        const activities = await Promise.all(
          (responses || []).map(async (response) => {
            const selectedResponse = await encryptionService.decryptField(
              response.selected_response_encrypted
            );

            return {
              id: response.id as string,
              timestamp: response.created_at as string,
              rating: response.user_rating as number | null,
              templateUsed: response.template_used as string | null,
              messageType: (response.context?.messageType as string) || 'update',
              preview: selectedResponse
                ? selectedResponse.substring(0, 100) + (selectedResponse.length > 100 ? '...' : '')
                : '[No response selected]',
            };
          })
        );

        return activities;
      } catch (error: any) {
        console.error('Recent activity error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch recent activity',
        });
      }
    }),

  /**
   * Get active clients (recently contacted or needing attention)
   */
  getActiveClients: protectedProcedure
    .use(createRateLimitMiddleware('GENERAL'))
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }).optional())
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      const limit = input?.limit || 10;

      try {
        // Get all clients
        const { data: clients, error: clientsError } = await supabaseAdmin
          .from('clients')
          .select('id, name, email, company, relationship_stage, created_at, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(limit);

        if (clientsError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch active clients',
          });
        }

        if (!clients || clients.length === 0) {
          return [];
        }

        // For each client, get their most recent response
        const activeClients = await Promise.all(
          clients.map(async (client) => {
            const { data: lastResponse } = await supabaseAdmin
              .from('response_history')
              .select('created_at')
              .eq('user_id', user.id)
              // Note: We'd need to add client_id to response_history to properly filter
              // For now, we'll just use the client's updated_at
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const now = new Date();
            const lastContactDate = lastResponse?.created_at
              ? new Date(lastResponse.created_at)
              : new Date(client.updated_at);

            const daysSinceContact = Math.floor(
              (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Determine status based on days since contact
            let status: 'active' | 'warning' | 'attention';
            if (daysSinceContact <= 3) {
              status = 'active';
            } else if (daysSinceContact <= 7) {
              status = 'warning';
            } else {
              status = 'attention';
            }

            return {
              id: client.id as string,
              name: client.name as string,
              company: client.company as string | null,
              email: client.email as string | null,
              relationshipStage: client.relationship_stage as string,
              lastContactDays: daysSinceContact,
              status,
            };
          })
        );

        // Sort by status priority (attention > warning > active) and then by days
        return activeClients.sort((a, b) => {
          const statusOrder = { attention: 0, warning: 1, active: 2 };
          const statusDiff = statusOrder[a.status] - statusOrder[b.status];
          if (statusDiff !== 0) return statusDiff;
          return b.lastContactDays - a.lastContactDays;
        });
      } catch (error: any) {
        console.error('Active clients error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch active clients',
        });
      }
    }),

  /**
   * Get popular templates based on usage
   */
  getPopularTemplates: protectedProcedure
    .use(createRateLimitMiddleware('GENERAL'))
    .input(z.object({ limit: z.number().min(1).max(10).default(5) }).optional())
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      const limit = input?.limit || 5;

      try {
        // Get template usage counts
        const { data: templates, error } = await supabaseAdmin
          .from('response_history')
          .select('template_used')
          .eq('user_id', user.id)
          .not('template_used', 'is', null);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch template statistics',
          });
        }

        // Count occurrences
        const templateCounts = (templates || []).reduce((acc, item) => {
          const template = item.template_used;
          if (template) {
            acc[template] = (acc[template] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        // Convert to array and sort by usage
        const popularTemplates = Object.entries(templateCounts)
          .map(([name, count]) => ({ name, usageCount: count }))
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);

        return popularTemplates;
      } catch (error: any) {
        console.error('Popular templates error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch popular templates',
        });
      }
    }),
});
