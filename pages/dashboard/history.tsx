import { useState } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { trpc } from '../../utils/trpc';
import { formatDistanceToNow } from 'date-fns';

export default function HistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch response history
  const { data: history, isLoading, error, refetch } = trpc.responses.getHistory.useQuery({
    limit: 50,
    offset: 0,
  });

  const handleViewResponse = (id: string) => {
    router.push(`/dashboard/history/${id}`);
  };

  const handleCopyResponse = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      alert('Response copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const handleNewResponse = () => {
    router.push('/dashboard/generate');
  };

  const filteredHistory = history?.filter((item) =>
    searchQuery
      ? item.originalMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.context?.messageType?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <ProtectedRoute>
      <DashboardLayout title="Response History">
        <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Response History</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage all your AI-generated responses
          </p>
        </div>
        <button
          onClick={handleNewResponse}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          + Generate New Response
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Responses</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {history?.length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">This Month</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {history?.filter(item => {
              const created = new Date(item.createdAt);
              const now = new Date();
              return created.getMonth() === now.getMonth() &&
                     created.getFullYear() === now.getFullYear();
            }).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">This Week</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {history?.filter(item => {
              const created = new Date(item.createdAt);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return created >= weekAgo;
            }).length || 0}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Search responses by message or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          />
          <svg
            className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your responses...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-red-600 dark:text-red-400">Error loading history: {error.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Try Again
            </button>
          </div>
        ) : !filteredHistory || filteredHistory.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              {searchQuery ? 'No results found' : 'No responses yet'}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Generate your first AI response to see it here'}
            </p>
            <button
              onClick={handleNewResponse}
              className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Generate Your First Response
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => handleViewResponse(item.id)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Original Message Preview */}
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.originalMessage?.substring(0, 100)}
                      {item.originalMessage && item.originalMessage.length > 100 ? '...' : ''}
                    </p>

                    {/* Metadata */}
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>

                      {item.context?.messageType && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded font-medium">
                          {item.context.messageType}
                        </span>
                      )}

                      {item.context?.urgency && (
                        <span className={`px-2 py-1 rounded font-medium ${
                          item.context.urgency === 'immediate' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300' :
                          item.context.urgency === 'standard' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' :
                          'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                        }`}>
                          {item.context.urgency}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        item.selectedResponse && handleCopyResponse(String(item.selectedResponse));
                      }}
                      className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewResponse(item.id);
                      }}
                      className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
