import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import {
  HistoryListParamsSchema,
  DeleteHistoryParamsSchema,
  BulkHistoryActionSchema,
  type HistorySearchResponse,
  type HistorySearchResult,
} from '@freelance-flow/shared';
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

export const historyRouter = router({
  /**
   * Advanced history list with cursor-based pagination and search
   */
  list: protectedProcedure
    .use(createRateLimitMiddleware('HISTORY'))
    .input(HistoryListParamsSchema)
    .query(async ({ input, ctx }) => {
      const { limit, cursor, filters } = input;
      const { user } = ctx;

      try {
        // Build query with filters
        let query = supabaseAdmin
          .from('response_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit + 1); // Get one extra to check if there are more

        // Apply cursor for pagination
        if (cursor) {
          const { data: cursorData } = await supabaseAdmin
            .from('response_history')
            .select('created_at')
            .eq('id', cursor)
            .single();

          if (cursorData) {
            query = query.lt('created_at', cursorData.created_at);
          }
        }

        // Apply search filters
        // WARNING: Direct ILIKE search on encrypted fields will not work
        // This is a known limitation - encrypted data must be decrypted client-side for search
        // TODO: Implement alternative search strategy (search tokens, client-side filtering, or search index)
        if (filters?.keywords) {
          console.warn('Keyword search on encrypted fields is not supported - returning unfiltered results');
        }

        if (filters?.dateFrom) {
          query = query.gte('created_at', filters.dateFrom);
        }

        if (filters?.dateTo) {
          query = query.lte('created_at', filters.dateTo);
        }

        if (filters?.context) {
          const contextFilters = filters.context;
          if (contextFilters.relationshipStage) {
            query = query.eq('context->relationshipStage', contextFilters.relationshipStage);
          }
          if (contextFilters.projectPhase) {
            query = query.eq('context->projectPhase', contextFilters.projectPhase);
          }
          if (contextFilters.urgency) {
            query = query.eq('context->urgency', contextFilters.urgency);
          }
          if (contextFilters.messageType) {
            query = query.eq('context->messageType', contextFilters.messageType);
          }
        }

        const { data: results, error } = await query;

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch history',
          });
        }

        // Determine if there are more results
        const hasMore = results.length > limit;
        const items = hasMore ? results.slice(0, limit) : results;
        const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

        // Get total count for search context
        const { count: totalCount } = await supabaseAdmin
          .from('response_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const response: HistorySearchResponse = {
          results: await Promise.all(items.map(async (item) => ({
            id: item.id,
            originalMessage: await encryptionService.decryptField(item.original_message_encrypted) || '[Encrypted]',
            context: item.context,
            generatedOptions: item.generated_options,
            selectedResponse: item.selected_response,
            userRating: item.user_rating,
            createdAt: item.created_at,
            snippet: filters?.keywords
              ? generateSnippet(item.original_message_encrypted, filters.keywords)
              : undefined,
          }))),
          nextCursor,
          totalCount: totalCount || 0,
          hasMore,
        };

        return response;
      } catch (error: any) {
        console.error('History list error:', error);

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
   * Full-text search across response history
   */
  search: protectedProcedure
    .use(createRateLimitMiddleware('HISTORY'))
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { query: searchQuery, limit, offset } = input;
      const { user } = ctx;

      try {
        // WARNING: Encrypted field search limitation
        // ILIKE pattern matching on encrypted data will not work correctly
        // For production, implement: tokenization, client-side decryption+filter, or search indexes
        // Current implementation returns unfiltered results as placeholder
        const { data: results, error } = await supabaseAdmin
          .from('response_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Search failed',
          });
        }

        // Get total count for pagination
        const { count: totalCount } = await supabaseAdmin
          .from('response_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const searchResults: HistorySearchResult[] = await Promise.all(results.map(async (item) => {
          const decryptedMessage = await encryptionService.decryptField(item.original_message_encrypted) || '[Encrypted]';
          return {
            id: item.id,
            originalMessage: decryptedMessage,
            context: item.context,
            generatedOptions: item.generated_options,
            selectedResponse: item.selected_response,
            userRating: item.user_rating,
            createdAt: item.created_at,
            snippet: generateSnippet(decryptedMessage, searchQuery),
          };
        }));

        return {
          results: searchResults,
          totalCount: totalCount || 0,
          hasMore: (offset + limit) < (totalCount || 0),
        };
      } catch (error: any) {
        console.error('History search error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Search failed',
        });
      }
    }),

  /**
   * Delete response history items (soft delete by default)
   */
  delete: protectedProcedure
    .use(createRateLimitMiddleware('HISTORY'))
    .input(DeleteHistoryParamsSchema)
    .mutation(async ({ input, ctx }) => {
      const { ids, permanent } = input;
      const { user } = ctx;

      try {
        if (permanent) {
          // Permanent deletion
          const { error } = await supabaseAdmin
            .from('response_history')
            .delete()
            .in('id', ids)
            .eq('user_id', user.id);

          if (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to delete history items',
            });
          }
        } else {
          // Soft delete (mark as deleted)
          const { error } = await supabaseAdmin
            .from('response_history')
            .update({
              user_feedback: 'DELETED',
              updated_at: new Date().toISOString()
            })
            .in('id', ids)
            .eq('user_id', user.id);

          if (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to delete history items',
            });
          }
        }

        return { success: true, deletedCount: ids.length };
      } catch (error: any) {
        console.error('History delete error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete history items',
        });
      }
    }),

  /**
   * Get a single history item by ID
   */
  getById: protectedProcedure
    .use(createRateLimitMiddleware('HISTORY'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const { user } = ctx;

      try {
        const { data: item, error } = await supabaseAdmin
          .from('response_history')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error || !item) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'History item not found',
          });
        }

        return {
          id: item.id,
          originalMessage: await encryptionService.decryptField(item.original_message_encrypted) || '[Encrypted]',
          context: item.context,
          generatedOptions: item.generated_options,
          selectedResponse: await encryptionService.decryptField(item.selected_response_encrypted) || '[Encrypted]',
          userRating: item.user_rating,
          userFeedback: item.user_feedback,
          templateUsed: item.template_used,
          refinementCount: item.refinement_count,
          refinementInstructions: item.refinement_instructions,
          openaiModel: item.openai_model,
          generationCostCents: item.generation_cost_cents,
          confidenceScore: item.confidence_score,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      } catch (error: any) {
        console.error('Get history item error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch history item',
        });
      }
    }),

  /**
   * Bulk operations on history items
   */
  bulkAction: protectedProcedure
    .use(createRateLimitMiddleware('HISTORY'))
    .input(BulkHistoryActionSchema)
    .mutation(async ({ input, ctx }) => {
      const { action, ids } = input;
      const { user } = ctx;

      try {
        if (action === 'delete') {
          // Use the existing delete functionality
          const { error } = await supabaseAdmin
            .from('response_history')
            .update({
              user_feedback: 'DELETED',
              updated_at: new Date().toISOString()
            })
            .in('id', ids)
            .eq('user_id', user.id);

          if (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to delete history items',
            });
          }

          return { success: true, processedCount: ids.length };
        } else if (action === 'export') {
          // Export functionality - get the data for export
          const { data: items, error } = await supabaseAdmin
            .from('response_history')
            .select('*')
            .in('id', ids)
            .eq('user_id', user.id);

          if (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to export history items',
            });
          }

          return {
            success: true,
            data: items,
            processedCount: items.length
          };
        }

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid bulk action',
        });
      } catch (error: any) {
        console.error('Bulk action error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Bulk action failed',
        });
      }
    }),

  /**
   * Rate a specific response variant
   */
  rateResponse: protectedProcedure
    .use(createRateLimitMiddleware('HISTORY'))
    .input(z.object({
      historyId: z.string().uuid(),
      responseId: z.string(),
      rating: z.number().min(1).max(5),
    }))
    .mutation(async ({ ctx, input }) => {
      const { historyId, responseId, rating } = input;
      const { user } = ctx;

      try {
        // Get the response history record
        const { data: historyItem, error: fetchError } = await supabaseAdmin
          .from('response_history')
          .select('*')
          .eq('id', historyId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !historyItem) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'History item not found',
          });
        }

        // Update the generated_options to include the rating for this specific response
        const generatedOptions = historyItem.generated_options as any[];
        const responseIndex = generatedOptions.findIndex((_, idx) => `response-${idx}` === responseId);

        if (responseIndex === -1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Response not found in history item',
          });
        }

        generatedOptions[responseIndex] = {
          ...generatedOptions[responseIndex],
          userRating: rating,
        };

        // Update the record
        const { error: updateError } = await supabaseAdmin
          .from('response_history')
          .update({
            generated_options: generatedOptions,
            user_rating: rating,
            updated_at: new Date().toISOString(),
          })
          .eq('id', historyId)
          .eq('user_id', user.id);

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update rating',
          });
        }

        // Trigger style analysis if rating is >= 4
        if (rating >= 4) {
          // Call Supabase Edge Function asynchronously
          const supabaseClient = createClient(
            serverConfig.supabase.url,
            serverConfig.supabase.anonKey,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            }
          );

          // Don't await - let it run in background
          supabaseClient.functions
            .invoke('analyze-style', {
              body: { userId: user.id },
            })
            .catch((err) => {
              console.error('Style analysis trigger error:', err);
            });
        }

        return { success: true };
      } catch (error: any) {
        console.error('Rate response error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to rate response',
        });
      }
    }),

  /**
   * Mark a response as copied
   */
  markResponseAsCopied: protectedProcedure
    .use(createRateLimitMiddleware('HISTORY'))
    .input(z.object({
      historyId: z.string().uuid(),
      responseId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { historyId, responseId } = input;
      const { user } = ctx;

      try {
        // Update the record with copied response ID
        const { error: updateError } = await supabaseAdmin
          .from('response_history')
          .update({
            copied_response_id: responseId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', historyId)
          .eq('user_id', user.id);

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to mark response as copied',
          });
        }

        // Trigger style analysis
        const supabaseClient = createClient(
          serverConfig.supabase.url,
          serverConfig.supabase.anonKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        );

        // Don't await - let it run in background
        supabaseClient.functions
          .invoke('analyze-style', {
            body: { userId: user.id },
          })
          .catch((err) => {
            console.error('Style analysis trigger error:', err);
          });

        return { success: true };
      } catch (error: any) {
        console.error('Mark response as copied error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark response as copied',
        });
      }
    }),
});

// Helper function to generate search snippets
function generateSnippet(text: string, searchTerm: string, maxLength: number = 150): string {
  const lowerText = text.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);

  if (index === -1) return text.substring(0, maxLength) + '...';

  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + searchTerm.length + 50);

  let snippet = text.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}