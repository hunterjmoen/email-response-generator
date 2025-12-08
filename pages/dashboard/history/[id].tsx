import { useRouter } from 'next/router';
import { DashboardLayout } from '../../../components/layouts/DashboardLayout';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { trpc } from '../../../utils/trpc';
import { formatDistanceToNow, format } from 'date-fns';
import { ArrowLeftIcon, StarIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function HistoryDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { data: history, isLoading, error } = trpc.responses.getHistoryById.useQuery(
    { id: id as string },
    { enabled: !!id }
  );

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getMessageTypeLabel = (messageType: string) => {
    const labels: Record<string, string> = {
      update: 'Status Update',
      question: 'Question',
      concern: 'Concern',
      deliverable: 'Deliverable',
      payment: 'Payment',
      scope_change: 'Scope Change',
    };
    return labels[messageType] || messageType;
  };

  const getMessageTypeColor = (messageType: string) => {
    const colors: Record<string, string> = {
      update: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      question: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      concern: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      deliverable: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      payment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      scope_change: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[messageType] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <ProtectedRoute>
      <DashboardLayout title="Response Details">
        <div className="p-6 space-y-6">
          {/* Back Button */}
          <button
            onClick={() => router.push('/dashboard/history')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to History
          </button>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading response details...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-red-600 dark:text-red-400">Error: {error.message}</p>
              <button
                onClick={() => router.push('/dashboard/history')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Return to History
              </button>
            </div>
          ) : history ? (
            <>
              {/* Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-sm px-3 py-1 rounded-full font-medium ${getMessageTypeColor(history.context?.messageType || 'update')}`}>
                        {getMessageTypeLabel(history.context?.messageType || 'update')}
                      </span>
                      {history.userRating && (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <StarIcon className="w-5 h-5 fill-current" />
                          {history.userRating}/5
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Generated {formatDistanceToNow(new Date(history.createdAt), { addSuffix: true })}
                      {' - '}
                      {format(new Date(history.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {history.context?.urgency && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      history.context.urgency === 'immediate' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300' :
                      history.context.urgency === 'standard' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' :
                      'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                    }`}>
                      {history.context.urgency}
                    </span>
                  )}
                </div>
              </div>

              {/* Original Message */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Original Message
                </h2>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {history.originalMessage}
                  </p>
                </div>
              </div>

              {/* Generated Options */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Generated Responses
                </h2>
                <div className="space-y-4">
                  {history.generatedOptions?.map((option: { content: string; tone: string; confidence: number }, index: number) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-4 ${
                        history.selectedResponse === index
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Option {index + 1}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                            {option.tone}
                          </span>
                          {history.selectedResponse === index && (
                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 rounded text-green-700 dark:text-green-300">
                              Selected
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleCopy(option.content, index)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {copiedIndex === index ? (
                            <>
                              <CheckIcon className="w-4 h-4 text-green-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <ClipboardIcon className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {option.content}
                      </p>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Confidence: {Math.round(option.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              {history.userFeedback && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Your Feedback
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300">
                    {history.userFeedback}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Details
                </h2>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Model</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">{history.openaiModel}</dd>
                  </div>
                  {history.templateUsed && (
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Template</dt>
                      <dd className="text-gray-900 dark:text-gray-100 font-medium">{history.templateUsed}</dd>
                    </div>
                  )}
                  {history.refinementCount > 0 && (
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Refinements</dt>
                      <dd className="text-gray-900 dark:text-gray-100 font-medium">{history.refinementCount}</dd>
                    </div>
                  )}
                  {history.confidenceScore && (
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Avg Confidence</dt>
                      <dd className="text-gray-900 dark:text-gray-100 font-medium">{Math.round(history.confidenceScore * 100)}%</dd>
                    </div>
                  )}
                </dl>
              </div>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
