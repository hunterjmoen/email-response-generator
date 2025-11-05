import { useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { trpc } from '../../utils/trpc';
import { ResponseHistoryItem } from './ResponseHistoryItem';
import { HistoryActions } from './HistoryActions';
import {
  type HistorySearchFilters,
  type HistorySearchResult,
} from '@freelance-flow/shared';

interface ResponseHistoryListProps {
  filters?: HistorySearchFilters;
  onItemView: (id: string) => void;
  onItemCopy: (content: string) => void;
  onRefresh?: () => void;
}

export function ResponseHistoryList({
  filters,
  onItemView,
  onItemCopy,
  onRefresh,
}: ResponseHistoryListProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showActions, setShowActions] = useState(false);

  // Use infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['history.list', filters],
    queryFn: ({ pageParam }) =>
      trpc.history.list.query({
        limit: 10,
        cursor: pageParam,
        filters,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
  });

  // Scroll-based infinite loading
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000
        && hasNextPage
        && !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Reset selected items when filters change
  useEffect(() => {
    setSelectedItems(new Set());
    setShowActions(false);
  }, [filters]);

  const allItems = data?.pages.flatMap(page => page.results) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;

  const handleItemSelect = useCallback((id: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      setShowActions(newSet.size > 0);
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(allItems.map(item => item.id));
    setSelectedItems(allIds);
    setShowActions(allIds.size > 0);
  }, [allItems]);

  const handleDeselectAll = useCallback(() => {
    setSelectedItems(new Set());
    setShowActions(false);
  }, []);

  const handleBulkDelete = useCallback(async (permanent = false) => {
    try {
      await trpc.history.delete.mutate({
        ids: Array.from(selectedItems),
        permanent,
      });

      setSelectedItems(new Set());
      setShowActions(false);
      refetch();
      onRefresh?.();
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  }, [selectedItems, refetch, onRefresh]);

  const handleBulkExport = useCallback(async () => {
    try {
      const result = await trpc.history.bulkAction.mutate({
        action: 'export',
        ids: Array.from(selectedItems),
      });

      if (result.success && result.data) {
        // Create and download CSV
        const csvContent = generateCSV(result.data);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `history-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Bulk export failed:', error);
    }
  }, [selectedItems]);

  const handleItemDelete = useCallback(async (id: string) => {
    try {
      await trpc.history.delete.mutate({
        ids: [id],
        permanent: false,
      });
      refetch();
      onRefresh?.();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }, [refetch, onRefresh]);

  // Helper function to generate CSV
  const generateCSV = (items: any[]) => {
    const headers = [
      'Date',
      'Original Message',
      'Context',
      'Selected Response',
      'User Rating',
      'Confidence Score'
    ];

    const rows = items.map(item => [
      new Date(item.created_at).toLocaleDateString(),
      `"${item.original_message.replace(/"/g, '""')}"`,
      `"${JSON.stringify(item.context).replace(/"/g, '""')}"`,
      item.selected_response !== null
        ? `"${item.generated_options[item.selected_response]?.content?.replace(/"/g, '""') || ''}"`
        : '',
      item.user_rating || '',
      item.confidence_score || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
              </div>
              <div className="mt-4 flex space-x-2">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">
          Failed to load history: {error?.message || 'Unknown error'}
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <div className="mb-4">
          {filters && (filters.keywords || filters.dateFrom || filters.dateTo || filters.context) ? (
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No results found</p>
              <p>Try adjusting your search filters or keywords.</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No response history yet</p>
              <p>Your AI-generated responses will appear here once you start using the tool.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results summary and bulk actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {allItems.length} of {totalCount} responses
          {selectedItems.size > 0 && (
            <span className="ml-2 text-blue-600 dark:text-blue-400">
              ({selectedItems.size} selected)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {allItems.length > 0 && (
            <>
              <button
                onClick={selectedItems.size === allItems.length ? handleDeselectAll : handleSelectAll}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                {selectedItems.size === allItems.length ? 'Deselect All' : 'Select All'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk actions bar */}
      {showActions && (
        <HistoryActions
          selectedCount={selectedItems.size}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
          onCancel={handleDeselectAll}
        />
      )}

      {/* History items */}
      <div className="space-y-4">
        {allItems.map((item) => (
          <ResponseHistoryItem
            key={item.id}
            item={item}
            onCopy={onItemCopy}
            onDelete={handleItemDelete}
            onView={onItemView}
            onSelect={handleItemSelect}
            isSelected={selectedItems.has(item.id)}
            showActions={true}
          />
        ))}
      </div>

      {/* Load more indicator */}
      {isFetchingNextPage && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-500"></div>
            <span>Loading more...</span>
          </div>
        </div>
      )}

      {/* End of results indicator */}
      {!hasNextPage && allItems.length > 0 && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          You've reached the end of your history
        </div>
      )}
    </div>
  );
}