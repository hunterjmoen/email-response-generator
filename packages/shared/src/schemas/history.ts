import { z } from 'zod';

// History search filters schema
export const HistorySearchFiltersSchema = z.object({
  keywords: z.string().min(1).max(100).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  context: z.object({
    relationshipStage: z.enum(['new', 'established', 'difficult', 'long_term']).optional(),
    projectPhase: z.enum(['discovery', 'active', 'completion', 'maintenance', 'on_hold']).optional(),
    urgency: z.enum(['immediate', 'standard', 'non_urgent']).optional(),
    messageType: z.enum(['update', 'question', 'concern', 'deliverable', 'payment', 'scope_change']).optional(),
  }).optional(),
});

// History list parameters schema
export const HistoryListParamsSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  cursor: z.string().uuid().optional(),
  filters: HistorySearchFiltersSchema.optional(),
});

// Delete history parameters schema
export const DeleteHistoryParamsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  permanent: z.boolean().default(false),
});

// Bulk action parameters schema
export const BulkHistoryActionSchema = z.object({
  action: z.enum(['delete', 'export']),
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// Export types inferred from schemas
export type ValidatedHistorySearchFilters = z.infer<typeof HistorySearchFiltersSchema>;
export type ValidatedHistoryListParams = z.infer<typeof HistoryListParamsSchema>;
export type ValidatedDeleteHistoryParams = z.infer<typeof DeleteHistoryParamsSchema>;
export type ValidatedBulkHistoryAction = z.infer<typeof BulkHistoryActionSchema>;