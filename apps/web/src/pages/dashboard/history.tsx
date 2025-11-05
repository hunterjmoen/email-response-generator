import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuthStore } from '../../stores/auth';
import {
  ResponseHistoryList,
  HistorySearch,
} from '../../components/history';
import { trpc } from '../../utils/trpc';
import {
  ChevronLeftIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { type HistorySearchFilters } from '@freelance-flow/shared';

export default function HistoryPage() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const [searchFilters, setSearchFilters] = useState<HistorySearchFilters>({});
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const logoutMutation = trpc.auth.logout.useMutation();

  // Get user subscription info for usage display
  const { data: subscriptionData } = trpc.responses.getHistory.useQuery(
    { limit: 1, offset: 0 },
    { enabled: !!user }
  );

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      clearAuth();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      clearAuth();
      router.push('/auth/login');
    }
  };

  const handleSearch = useCallback((filters: HistorySearchFilters) => {
    setSearchFilters(filters);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchFilters({});
  }, []);

  const handleItemView = useCallback((id: string) => {
    // Navigate to detail view or open modal
    router.push(`/dashboard/history/${id}`);
  }, [router]);

  const handleItemCopy = useCallback((content: string) => {
    setCopyFeedback('Response copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 3000);
  }, []);

  const handleRefresh = useCallback(() => {
    // This will be called by the list component when it needs to refresh
    // The list component handles its own refetch
  }, []);

  const navigateToGenerate = () => {
    router.push('/dashboard/generate');
  };

  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={navigateToDashboard}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  <span>Back to Dashboard</span>
                </button>
                <div className="h-6 border-l border-gray-300 dark:border-gray-600"></div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Response History</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 dark:text-gray-300">
                  Welcome, {user?.firstName} {user?.lastName}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation breadcrumb */}
        <div className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex py-3 text-sm">
              <button
                onClick={navigateToDashboard}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Dashboard
              </button>
              <span className="text-gray-400 dark:text-gray-500 mx-2">/</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Response History</span>
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Page header with stats */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                  Your AI Response History
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  View, search, and manage all your AI-generated responses
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <button
                  onClick={navigateToGenerate}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Generate New Response
                </button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Total Responses
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {subscriptionData?.length || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          This Month
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {user?.subscription?.usage_count || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Plan Limit
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {user?.subscription?.monthly_limit || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copy feedback notification */}
          {copyFeedback && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400 dark:text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    {copyFeedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search component */}
          <HistorySearch
            onSearch={handleSearch}
            onClear={handleClearSearch}
            initialFilters={searchFilters}
          />

          {/* History list */}
          <ResponseHistoryList
            filters={searchFilters}
            onItemView={handleItemView}
            onItemCopy={handleItemCopy}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}

HistoryPage.getLayout = function getLayout(page: React.ReactElement) {
  return <>{page}</>;
};