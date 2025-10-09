import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponseHistoryList } from '../../../src/components/history/ResponseHistoryList';
import type { HistorySearchFilters } from '@freelance-flow/shared';

// Mock infinite scroll hook
const mockUseInfiniteQuery = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useInfiniteQuery: () => mockUseInfiniteQuery(),
  };
});

// Mock tRPC
const mockTrpc = {
  history: {
    list: {
      query: vi.fn(),
    },
    delete: {
      mutate: vi.fn(),
    },
    bulkAction: {
      mutate: vi.fn(),
    },
  },
};

vi.mock('../../../src/utils/trpc', () => ({
  trpc: mockTrpc,
}));

// Mock history components
vi.mock('../../../src/components/history/ResponseHistoryItem', () => ({
  ResponseHistoryItem: ({ item, onSelect, onCopy, onDelete, onView, isSelected }: any) => (
    <div data-testid={`history-item-${item.id}`}>
      <span>{item.originalMessage}</span>
      <button onClick={() => onSelect(item.id, !isSelected)}>
        {isSelected ? 'Deselect' : 'Select'}
      </button>
      <button onClick={() => onCopy(item.generatedOptions[0]?.content)}>Copy</button>
      <button onClick={() => onDelete(item.id)}>Delete</button>
      <button onClick={() => onView(item.id)}>View</button>
    </div>
  ),
}));

vi.mock('../../../src/components/history/HistoryActions', () => ({
  HistoryActions: ({ selectedCount, onBulkDelete, onBulkExport, onCancel }: any) => (
    <div data-testid="history-actions">
      <span>Selected: {selectedCount}</span>
      <button onClick={() => onBulkDelete(false)}>Bulk Delete</button>
      <button onClick={onBulkExport}>Bulk Export</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const mockHistoryData = {
  pages: [
    {
      results: [
        {
          id: '1',
          originalMessage: 'First test message',
          context: { urgency: 'standard' },
          generatedOptions: [{ content: 'First response' }],
          selectedResponse: 0,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          originalMessage: 'Second test message',
          context: { urgency: 'immediate' },
          generatedOptions: [{ content: 'Second response' }],
          selectedResponse: 0,
          createdAt: '2024-01-14T10:00:00Z',
        },
      ],
      nextCursor: 'cursor-123',
      totalCount: 25,
      hasMore: true,
    },
  ],
  pageParams: [undefined],
};

describe('ResponseHistoryList', () => {
  const mockHandlers = {
    onItemView: vi.fn(),
    onItemCopy: vi.fn(),
    onRefresh: vi.fn(),
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default mock implementation
    mockUseInfiniteQuery.mockReturnValue({
      data: mockHistoryData,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  const renderWithQueryClient = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ResponseHistoryList {...mockHandlers} {...props} />
      </QueryClientProvider>
    );
  };

  it('renders history items when data is loaded', () => {
    renderWithQueryClient();

    expect(screen.getByTestId('history-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('history-item-2')).toBeInTheDocument();
    expect(screen.getByText('First test message')).toBeInTheDocument();
    expect(screen.getByText('Second test message')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    renderWithQueryClient();

    // Should show loading skeletons
    const loadingElements = screen.getAllByRole('generic');
    expect(loadingElements.some(el => el.className.includes('animate-pulse'))).toBe(true);
  });

  it('shows error state', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: 'Failed to load' },
      refetch: vi.fn(),
    });

    renderWithQueryClient();

    expect(screen.getByText(/Failed to load history/)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [{ results: [], totalCount: 0, hasMore: false }] },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderWithQueryClient();

    expect(screen.getByText('No response history yet')).toBeInTheDocument();
  });

  it('shows filtered empty state when filters applied', () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [{ results: [], totalCount: 0, hasMore: false }] },
      isLoading: false,
      isError: false,
      error: null,
    });

    const filters: HistorySearchFilters = { keywords: 'test' };
    renderWithQueryClient({ filters });

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your search filters/)).toBeInTheDocument();
  });

  it('displays results summary', () => {
    renderWithQueryClient();

    expect(screen.getByText('Showing 2 of 25 responses')).toBeInTheDocument();
  });

  it('handles item selection', () => {
    renderWithQueryClient();

    const selectButton = screen.getAllByText('Select')[0];
    fireEvent.click(selectButton);

    // Should show selection count
    expect(screen.getByText('(1 selected)')).toBeInTheDocument();
    expect(screen.getByTestId('history-actions')).toBeInTheDocument();
  });

  it('handles select all', () => {
    renderWithQueryClient();

    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);

    // Should show all items selected
    expect(screen.getByText('(2 selected)')).toBeInTheDocument();
    expect(screen.getByTestId('history-actions')).toBeInTheDocument();

    // Button should change to "Deselect All"
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  it('handles deselect all', () => {
    renderWithQueryClient();

    // First select all
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);

    // Then deselect all
    const deselectAllButton = screen.getByText('Deselect All');
    fireEvent.click(deselectAllButton);

    // Should hide actions and reset selection
    expect(screen.queryByTestId('history-actions')).not.toBeInTheDocument();
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('handles bulk delete', async () => {
    mockTrpc.history.delete.mutate.mockResolvedValue({ success: true });

    renderWithQueryClient();

    // Select an item
    const selectButton = screen.getAllByText('Select')[0];
    fireEvent.click(selectButton);

    // Bulk delete
    const bulkDeleteButton = screen.getByText('Bulk Delete');
    fireEvent.click(bulkDeleteButton);

    await waitFor(() => {
      expect(mockTrpc.history.delete.mutate).toHaveBeenCalledWith({
        ids: ['1'],
        permanent: false,
      });
    });
  });

  it('handles bulk export', async () => {
    // Mock successful export response
    mockTrpc.history.bulkAction.mutate.mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          original_message: 'Test message',
          context: { urgency: 'standard' },
          created_at: '2024-01-15T10:00:00Z',
        },
      ],
      processedCount: 1,
    });

    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    Object.defineProperty(document, 'createElement', {
      value: vi.fn(() => mockLink),
    });
    Object.defineProperty(document.body, 'appendChild', {
      value: mockAppendChild,
    });
    Object.defineProperty(document.body, 'removeChild', {
      value: mockRemoveChild,
    });

    renderWithQueryClient();

    // Select an item
    const selectButton = screen.getAllByText('Select')[0];
    fireEvent.click(selectButton);

    // Bulk export
    const bulkExportButton = screen.getByText('Bulk Export');
    fireEvent.click(bulkExportButton);

    await waitFor(() => {
      expect(mockTrpc.history.bulkAction.mutate).toHaveBeenCalledWith({
        action: 'export',
        ids: ['1'],
      });
    });

    // Should trigger download
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('handles individual item copy', () => {
    renderWithQueryClient();

    const copyButton = screen.getAllByText('Copy')[0];
    fireEvent.click(copyButton);

    expect(mockHandlers.onItemCopy).toHaveBeenCalledWith('First response');
  });

  it('handles individual item view', () => {
    renderWithQueryClient();

    const viewButton = screen.getAllByText('View')[0];
    fireEvent.click(viewButton);

    expect(mockHandlers.onItemView).toHaveBeenCalledWith('1');
  });

  it('handles individual item delete', async () => {
    const mockRefetch = vi.fn();
    mockUseInfiniteQuery.mockReturnValue({
      ...mockUseInfiniteQuery(),
      refetch: mockRefetch,
    });

    mockTrpc.history.delete.mutate.mockResolvedValue({ success: true });

    renderWithQueryClient();

    const deleteButton = screen.getAllByText('Delete')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockTrpc.history.delete.mutate).toHaveBeenCalledWith({
        ids: ['1'],
        permanent: false,
      });
    });

    expect(mockRefetch).toHaveBeenCalled();
    expect(mockHandlers.onRefresh).toHaveBeenCalled();
  });

  it('shows load more indicator when fetching next page', () => {
    mockUseInfiniteQuery.mockReturnValue({
      ...mockUseInfiniteQuery(),
      isFetchingNextPage: true,
    });

    renderWithQueryClient();

    expect(screen.getByText('Loading more...')).toBeInTheDocument();
  });

  it('shows end of results message when no more pages', () => {
    mockUseInfiniteQuery.mockReturnValue({
      ...mockUseInfiniteQuery(),
      hasNextPage: false,
    });

    renderWithQueryClient();

    expect(screen.getByText("You've reached the end of your history")).toBeInTheDocument();
  });

  it('resets selection when filters change', () => {
    const { rerender } = renderWithQueryClient();

    // Select an item
    const selectButton = screen.getAllByText('Select')[0];
    fireEvent.click(selectButton);

    expect(screen.getByTestId('history-actions')).toBeInTheDocument();

    // Change filters
    rerender(
      <QueryClientProvider client={queryClient}>
        <ResponseHistoryList
          {...mockHandlers}
          filters={{ keywords: 'new search' }}
        />
      </QueryClientProvider>
    );

    // Selection should be reset
    expect(screen.queryByTestId('history-actions')).not.toBeInTheDocument();
  });

  it('calls refetch when retry button is clicked in error state', () => {
    const mockRefetch = vi.fn();
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: 'Network error' },
      refetch: mockRefetch,
    });

    renderWithQueryClient();

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    expect(mockRefetch).toHaveBeenCalled();
  });
});