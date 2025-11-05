import { useState } from 'react';
import { useRouter } from 'next/router';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { useAuthStore } from '../../../stores/auth';
import { ResponseDisplay } from '../../../components/workflow/ResponseDisplay';
import { trpc } from '../../../utils/trpc';
import {
  ChevronLeftIcon,
  CalendarIcon,
  ClipboardIcon,
  TrashIcon,
  CheckIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export default function HistoryDetailPage() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const { id } = router.query;
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const logoutMutation = trpc.auth.logout.useMutation();
  const deleteHistoryMutation = trpc.history.delete.useMutation();

  // Fetch the specific history item
  const { data: historyItem, isLoading, isError, error } = trpc.history.getById.useQuery(
    { id: id as string },
    { enabled: !!id && typeof id === 'string' }
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

  const handleBackToHistory = () => {
    router.push('/dashboard/history');
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback('Response copied to clipboard!');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this response history?')) {
      return;
    }

    try {
      await deleteHistoryMutation.mutateAsync({
        ids: [id as string],
        permanent: false,
      });
      router.push('/dashboard/history');
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const getContextBadgeColor = (type: string, value: string) => {
    const colors = {
      urgency: {
        immediate: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
        standard: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        non_urgent: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      },
      messageType: {
        update: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        question: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
        concern: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
        deliverable: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
        payment: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
        scope_change: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      },
    };

    return colors[type as keyof typeof colors]?.[value as keyof any] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const Icon = rating >= star ? StarIconSolid : StarIcon;
          return (
            <Icon
              key={star}
              className={`h-4 w-4 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
            />
          );
        })}
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({rating}/5)</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isError || !historyItem) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Response Not Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error?.message || 'The response history item you requested could not be found.'}
              </p>
              <button
                onClick={handleBackToHistory}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                Back to History
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToHistory}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  <span>Back to History</span>
                </button>
                <div className="h-6 border-l border-gray-300 dark:border-gray-600"></div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Response Details</h1>
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

        {/* Main content */}
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Copy feedback notification */}
          {copyFeedback && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-5 w-5 text-green-400 dark:text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    {copyFeedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Item metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <CalendarIcon className="h-4 w-4" />
                <span>{formatDate(historyItem.createdAt)}</span>
                {historyItem.updatedAt !== historyItem.createdAt && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span>Updated {formatDate(historyItem.updatedAt)}</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {historyItem.userRating && renderStars(historyItem.userRating)}
                <button
                  onClick={handleDelete}
                  disabled={deleteHistoryMutation.isLoading}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Context information */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Context</h3>
              <div className="flex flex-wrap gap-2">
                {historyItem.context.urgency && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getContextBadgeColor('urgency', historyItem.context.urgency)
                  }`}>
                    {historyItem.context.urgency.replace('_', ' ')}
                  </span>
                )}
                {historyItem.context.messageType && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getContextBadgeColor('messageType', historyItem.context.messageType)
                  }`}>
                    {historyItem.context.messageType.replace('_', ' ')}
                  </span>
                )}
                {historyItem.context.projectPhase && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                    {historyItem.context.projectPhase.replace('_', ' ')}
                  </span>
                )}
                {historyItem.context.relationshipStage && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                    {historyItem.context.relationshipStage.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            {/* Original message */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Original Message</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {historyItem.originalMessage}
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Model:</span>
                <span className="ml-2 font-medium">{historyItem.openaiModel}</span>
              </div>
              {historyItem.confidenceScore && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
                  <span className="ml-2 font-medium">{Math.round(historyItem.confidenceScore * 100)}%</span>
                </div>
              )}
              {historyItem.generationCostCents && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Cost:</span>
                  <span className="ml-2 font-medium">${(historyItem.generationCostCents / 100).toFixed(2)}</span>
                </div>
              )}
              {historyItem.refinementCount > 0 && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Refinements:</span>
                  <span className="ml-2 font-medium">{historyItem.refinementCount}</span>
                </div>
              )}
            </div>

            {/* User feedback */}
            {historyItem.userFeedback && historyItem.userFeedback !== 'DELETED' && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Your Feedback</h3>
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-md p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-300">
                    {historyItem.userFeedback}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* AI Responses */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
              AI Response Options ({historyItem.generatedOptions.length})
            </h3>

            <div className="space-y-6">
              {historyItem.generatedOptions.map((response, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-6 ${
                    historyItem.selectedResponse === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Option {index + 1}
                        {historyItem.selectedResponse === index && (
                          <span className="ml-2 text-xs bg-blue-600 dark:bg-blue-500 text-white px-2 py-1 rounded-full">
                            Selected
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {response.tone}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {response.length}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Confidence:</span>
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                          {Math.round(response.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(response.content)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <ClipboardIcon className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>

                  <div className="prose prose-sm max-w-none mb-4">
                    <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                      {response.content}
                    </div>
                  </div>

                  {response.reasoning && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">AI Reasoning: </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{response.reasoning}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

HistoryDetailPage.getLayout = function getLayout(page: React.ReactElement) {
  return <>{page}</>;
};