import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { logError } from '../../utils/logger';
import type {
  ChangeOrder,
  ChangeOrderLineItem,
  ChangeOrderStatus,
} from '@freelance-flow/shared';

// Database row type for change_orders table
interface ChangeOrderRow {
  id: string;
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  response_history_id: string | null;
  title: string;
  description: string | null;
  line_items: Array<{
    id: string;
    description: string;
    hours: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  additional_timeline_days: number | null;
  status: string;
  response_text: string | null;
  original_request: string | null;
  detected_phrases: string[] | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  responded_at: string | null;
}

// Helper to transform database row to application type
function transformChangeOrder(row: ChangeOrderRow): ChangeOrder {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id ?? undefined,
    projectId: row.project_id ?? undefined,
    responseHistoryId: row.response_history_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    lineItems: row.line_items || [],
    subtotal: Number(row.subtotal),
    additionalTimelineDays: row.additional_timeline_days ?? 0,
    status: row.status as ChangeOrderStatus,
    responseText: row.response_text ?? undefined,
    originalRequest: row.original_request ?? undefined,
    detectedPhrases: row.detected_phrases ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sentAt: row.sent_at ?? undefined,
    respondedAt: row.responded_at ?? undefined,
  };
}

// Input schemas
const lineItemInputSchema = z.object({
  description: z.string().min(1),
  hours: z.number().min(0),
  rate: z.number().min(0),
});

const createChangeOrderSchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  lineItems: z.array(lineItemInputSchema).min(1),
  additionalTimelineDays: z.number().min(0).optional(),
  originalRequest: z.string().optional(),
  detectedPhrases: z.array(z.string()).optional(),
});

const updateChangeOrderSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  lineItems: z.array(lineItemInputSchema).optional(),
  additionalTimelineDays: z.number().min(0).optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'declined', 'expired']).optional(),
});

const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const changeOrderRouter = router({
  // List all change orders for the user
  list: protectedProcedure
    .input(paginationSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { limit, offset } = input || { limit: 20, offset: 0 };

        // Note: 'change_orders' table types will be available after running migration 018
        const { data, error, count } = await (ctx.supabase as any)
          .from('change_orders')
          .select('*', { count: 'exact' })
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          logError(error, { context: 'List change orders' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch change orders',
          });
        }

        const changeOrders = ((data as ChangeOrderRow[]) || []).map(transformChangeOrder);

        return {
          changeOrders,
          total: count || 0,
          limit,
          offset,
        };
      } catch (error) {
        logError(error, { context: 'List change orders' });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  // Get a single change order by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await (ctx.supabase as any)
          .from('change_orders')
          .select('*')
          .eq('id', input.id)
          .eq('user_id', ctx.user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Change order not found',
            });
          }
          logError(error, { context: 'Get change order by ID' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch change order',
          });
        }

        return transformChangeOrder(data as ChangeOrderRow);
      } catch (error) {
        logError(error, { context: 'Get change order by ID' });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  // Create a new change order
  create: protectedProcedure
    .input(createChangeOrderSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Generate IDs and calculate amounts for line items
        const lineItems: ChangeOrderLineItem[] = input.lineItems.map((item, index) => ({
          id: `item_${Date.now()}_${index}`,
          description: item.description,
          hours: item.hours,
          rate: item.rate,
          amount: item.hours * item.rate,
        }));

        // Calculate subtotal
        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

        const { data, error } = await (ctx.supabase as any)
          .from('change_orders')
          .insert({
            user_id: ctx.user.id,
            client_id: input.clientId || null,
            project_id: input.projectId || null,
            title: input.title,
            description: input.description || null,
            line_items: lineItems,
            subtotal,
            additional_timeline_days: input.additionalTimelineDays || 0,
            status: 'draft',
            original_request: input.originalRequest || null,
            detected_phrases: input.detectedPhrases || null,
          })
          .select()
          .single();

        if (error) {
          logError(error, { context: 'Create change order' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create change order',
          });
        }

        return transformChangeOrder(data as ChangeOrderRow);
      } catch (error) {
        logError(error, { context: 'Create change order' });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  // Update an existing change order
  update: protectedProcedure
    .input(updateChangeOrderSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const updateData: Record<string, unknown> = {};

        if (input.title !== undefined) {
          updateData.title = input.title;
        }

        if (input.description !== undefined) {
          updateData.description = input.description;
        }

        if (input.lineItems !== undefined) {
          // Generate IDs and calculate amounts for line items
          const lineItems: ChangeOrderLineItem[] = input.lineItems.map((item, index) => ({
            id: `item_${Date.now()}_${index}`,
            description: item.description,
            hours: item.hours,
            rate: item.rate,
            amount: item.hours * item.rate,
          }));

          updateData.line_items = lineItems;
          updateData.subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        }

        if (input.additionalTimelineDays !== undefined) {
          updateData.additional_timeline_days = input.additionalTimelineDays;
        }

        if (input.status !== undefined) {
          updateData.status = input.status;

          // Set timestamps based on status change
          if (input.status === 'sent') {
            updateData.sent_at = new Date().toISOString();
          } else if (['accepted', 'declined'].includes(input.status)) {
            updateData.responded_at = new Date().toISOString();
          }
        }

        const { data, error } = await (ctx.supabase as any)
          .from('change_orders')
          .update(updateData)
          .eq('id', input.id)
          .eq('user_id', ctx.user.id)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Change order not found',
            });
          }
          logError(error, { context: 'Update change order' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update change order',
          });
        }

        return transformChangeOrder(data as ChangeOrderRow);
      } catch (error) {
        logError(error, { context: 'Update change order' });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  // Delete a change order
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { error } = await (ctx.supabase as any)
          .from('change_orders')
          .delete()
          .eq('id', input.id)
          .eq('user_id', ctx.user.id);

        if (error) {
          logError(error, { context: 'Delete change order' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete change order',
          });
        }

        return { success: true };
      } catch (error) {
        logError(error, { context: 'Delete change order' });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  // Get change orders for a specific client
  listByClient: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await (ctx.supabase as any)
          .from('change_orders')
          .select('*')
          .eq('user_id', ctx.user.id)
          .eq('client_id', input.clientId)
          .order('created_at', { ascending: false })
          .limit(input.limit);

        if (error) {
          logError(error, { context: 'List change orders by client' });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch change orders',
          });
        }

        return ((data as ChangeOrderRow[]) || []).map(transformChangeOrder);
      } catch (error) {
        logError(error, { context: 'List change orders by client' });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),
});
