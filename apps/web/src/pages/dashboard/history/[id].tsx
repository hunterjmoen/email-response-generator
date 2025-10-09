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
        immediate: 'bg-red-100 text-red-800',
        standard: 'bg-blue-100 text-blue-800',
        non_urgent: 'bg-green-100 text-green-800',
      },
      messageType: {
        update: 'bg-blue-100 text-blue-800',
        question: 'bg-yellow-100 text-yellow-800',
        concern: 'bg-red-100 text-red-800',
        deliverable: 'bg-green-100 text-green-800',
        payment: 'bg-purple-100 text-purple-800',
        scope_change: 'bg-orange-100 text-orange-800',
      },
    };

    return colors[type as keyof typeof colors]?.[value as keyof any] || 'bg-gray-100 text-gray-800';
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
        <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="bg-white rounded-lg p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
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
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Response Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                {error?.message || 'The response history item you requested could not be found.'}
              </p>
              <button
                onClick={handleBackToHistory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToHistory}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  <span>Back to History</span>
                </button>
                <div className="h-6 border-l border-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-900">Response Details</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Welcome, {user?.firstName} {user?.lastName}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    {copyFeedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Item metadata */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <CalendarIcon className="h-4 w-4" />
                <span>{formatDate(historyItem.createdAt)}</span>
                {historyItem.updatedAt !== historyItem.createdAt && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>Updated {formatDate(historyItem.updatedAt)}</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {historyItem.userRating && renderStars(historyItem.userRating)}
                <button
                  onClick={handleDelete}
                  disabled={deleteHistoryMutation.isLoading}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Context information */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Context</h3>
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
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {historyItem.context.projectPhase.replace('_', ' ')}
                  </span>
                )}
                {historyItem.context.relationshipStage && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {historyItem.context.relationshipStage.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            {/* Original message */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Original Message</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {historyItem.originalMessage}
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Model:</span>
                <span className="ml-2 font-medium">{historyItem.openaiModel}</span>
              </div>
              {historyItem.confidenceScore && (
                <div>
                  <span className="text-gray-500">Confidence:</span>
                  <span className="ml-2 font-medium">{Math.round(historyItem.confidenceScore * 100)}%</span>
                </div>
              )}
              {historyItem.generationCostCents && (
                <div>
                  <span className="text-gray-500">Cost:</span>
                  <span className="ml-2 font-medium">${(historyItem.generationCostCents / 100).toFixed(2)}</span>
                </div>
              )}
              {historyItem.refinementCount > 0 && (
                <div>
                  <span className="text-gray-500">Refinements:</span>
                  <span className="ml-2 font-medium">{historyItem.refinementCount}</span>
                </div>
              )}
            </div>

            {/* User feedback */}
            {historyItem.userFeedback && historyItem.userFeedback !== 'DELETED' && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Your Feedback</h3>
                <div className="bg-blue-50 rounded-md p-4">
                  <p className="text-sm text-blue-900">
                    {historyItem.userFeedback}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* AI Responses */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              AI Response Options ({historyItem.generatedOptions.length})
            </h3>

            <div className="space-y-6">
              {historyItem.generatedOptions.map((response, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-6 ${
                    historyItem.selectedResponse === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        Option {index + 1}
                        {historyItem.selectedResponse === index && (
                          <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                            Selected
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {response.tone}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {response.length}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500">Confidence:</span>
                        <span className="text-xs font-medium text-gray-900">
                          {Math.round(response.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(response.content)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                    >
                      <ClipboardIcon className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>

                  <div className="prose prose-sm max-w-none mb-4">
                    <div className="whitespace-pre-wrap text-gray-900">
                      {response.content}
                    </div>
                  </div>

                  {response.reasoning && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <span className="text-xs font-medium text-gray-700">AI Reasoning: </span>
                      <span className="text-xs text-gray-600">{response.reasoning}</span>
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