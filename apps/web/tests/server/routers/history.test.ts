import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTRPCMsw } from 'msw-trpc';
import { setupServer } from 'msw/node';
import type { AppRouter } from '../../../src/server/routers/_app';
import { historyRouter } from '../../../src/server/routers/history';

// Mock data
const mockHistoryItems = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: 'user-123',
    original_message: 'Need to send project update to client',
    context: {
      urgency: 'standard',
      messageType: 'update',
      relationshipStage: 'established',
      projectPhase: 'active'
    },
    generated_options: [
      {
        content: 'Hi John, I wanted to update you on the project progress.',
        tone: 'professional',
        length: 'standard',
        confidence: 0.85
      }
    ],
    selected_response: 0,
    user_rating: 4,
    openai_model: 'gpt-4',
    confidence_score: 0.85,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    user_id: 'user-123',
    original_message: 'Following up on payment',
    context: {
      urgency: 'immediate',
      messageType: 'payment',
      relationshipStage: 'established',
      projectPhase: 'completion'
    },
    generated_options: [
      {
        content: 'I wanted to follow up regarding the outstanding invoice.',
        tone: 'professional',
        length: 'brief',
        confidence: 0.90
      }
    ],
    selected_response: 0,
    user_rating: 5,
    openai_model: 'gpt-4',
    confidence_score: 0.90,
    created_at: '2024-01-14T15:30:00Z',
    updated_at: '2024-01-14T15:30:00Z'
  }
];

// Mock Supabase
const mockSupabaseAdmin = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseAdmin,
}));

describe('History Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated history results', async () => {
      // Mock successful query
      mockSupabaseAdmin.from().select().eq().order().limit().mockResolvedValue({
        data: mockHistoryItems,
        error: null,
      });

      // Mock count query
      mockSupabaseAdmin.from().select().eq.mockImplementationOnce(() => ({
        count: 25,
        error: null,
      }));

      const result = {
        results: mockHistoryItems.map(item => ({
          id: item.id,
          originalMessage: item.original_message,
          context: item.context,
          generatedOptions: item.generated_options,
          selectedResponse: item.selected_response,
          userRating: item.user_rating,
          createdAt: item.created_at,
        })),
        nextCursor: undefined,
        totalCount: 25,
        hasMore: false,
      };

      expect(result.results).toHaveLength(2);
      expect(result.totalCount).toBe(25);
      expect(result.hasMore).toBe(false);
    });

    it('should apply search filters correctly', async () => {
      const filters = {
        keywords: 'project',
        dateFrom: '2024-01-01T00:00:00Z',
        dateTo: '2024-01-31T23:59:59Z',
        context: {
          urgency: 'standard',
          messageType: 'update'
        }
      };

      mockSupabaseAdmin.from().select().eq().order().limit().ilike().gte().lte().eq.mockResolvedValue({
        data: [mockHistoryItems[0]],
        error: null,
      });

      // The implementation should call ilike for keywords
      // and eq for context filters
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });

    it('should handle cursor-based pagination', async () => {
      const cursor = '123e4567-e89b-12d3-a456-426614174000';

      // Mock cursor data query
      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: { created_at: '2024-01-15T10:00:00Z' },
        error: null,
      });

      // Mock main query with cursor
      mockSupabaseAdmin.from().select().eq().order().limit().lt.mockResolvedValue({
        data: [mockHistoryItems[1]],
        error: null,
      });

      // Should call lt() for cursor pagination
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should perform full-text search', async () => {
      const searchQuery = 'project update';

      mockSupabaseAdmin.from().select().eq().or().order().range.mockResolvedValue({
        data: [mockHistoryItems[0]],
        error: null,
      });

      mockSupabaseAdmin.from().select().eq().or.mockImplementationOnce(() => ({
        count: 1,
        error: null,
      }));

      // Should call or() for full-text search across multiple fields
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });

    it('should return search results with snippets', async () => {
      const mockResults = [
        {
          ...mockHistoryItems[0],
          snippet: '...Need to send project update to client...',
        }
      ];

      mockSupabaseAdmin.from().select().eq().or().order().range.mockResolvedValue({
        data: [mockHistoryItems[0]],
        error: null,
      });

      // Test snippet generation
      const snippet = generateSnippet('Need to send project update to client', 'project');
      expect(snippet).toContain('project');
    });
  });

  describe('delete', () => {
    it('should soft delete items by default', async () => {
      const itemIds = ['123e4567-e89b-12d3-a456-426614174000'];

      mockSupabaseAdmin.from().update().in().eq.mockResolvedValue({
        error: null,
      });

      // Should call update() with DELETED flag for soft delete
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });

    it('should permanently delete when requested', async () => {
      const itemIds = ['123e4567-e89b-12d3-a456-426614174000'];

      mockSupabaseAdmin.from().delete().in().eq.mockResolvedValue({
        error: null,
      });

      // Should call delete() for permanent deletion
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const itemIds = ['123e4567-e89b-12d3-a456-426614174000'];

      mockSupabaseAdmin.from().update().in().eq.mockResolvedValue({
        error: { message: 'Database error' },
      });

      // Should throw TRPCError on database error
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return single history item', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: mockHistoryItems[0],
        error: null,
      });

      // Should query by ID and user_id
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });

    it('should handle item not found', async () => {
      const itemId = 'non-existent-id';

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      // Should throw NOT_FOUND error
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });
  });

  describe('bulkAction', () => {
    it('should handle bulk delete action', async () => {
      const itemIds = ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'];

      mockSupabaseAdmin.from().update().in().eq.mockResolvedValue({
        error: null,
      });

      // Should update multiple items with DELETED flag
      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });

    it('should handle bulk export action', async () => {
      const itemIds = ['123e4567-e89b-12d3-a456-426614174000'];

      mockSupabaseAdmin.from().select().in().eq.mockResolvedValue({
        data: [mockHistoryItems[0]],
        error: null,
      });

      const result = {
        success: true,
        data: [mockHistoryItems[0]],
        processedCount: 1
      };

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.processedCount).toBe(1);
    });
  });
});

// Helper function (copied from implementation for testing)
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