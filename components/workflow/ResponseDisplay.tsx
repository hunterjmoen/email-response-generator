import { useState } from 'react';
import { type AIResponseOptions } from '@freelance-flow/shared';
import { CheckIcon, ClipboardIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { trpc } from '../../utils/trpc';
import toast from 'react-hot-toast';

interface ResponseDisplayProps {
  responses: AIResponseOptions[];
  onCopy: (content: string, index: number) => void;
  onRate: (index: number, rating: number) => void;
  onSelect: (index: number) => void;
  selectedIndex?: number;
  isLoading?: boolean;
  historyId?: string;
}

export function ResponseDisplay({
  responses,
  onCopy,
  onRate,
  onSelect,
  selectedIndex,
  isLoading = false,
  historyId,
}: ResponseDisplayProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [expandedReasoning, setExpandedReasoning] = useState<Record<number, boolean>>({});

  const rateResponseMutation = trpc.history.rateResponse.useMutation({
    onError: (error) => {
      console.error('Failed to rate response:', error);
    },
  });

  const markCopiedMutation = trpc.history.markResponseAsCopied.useMutation({
    onError: (error) => {
      console.error('Failed to mark response as copied:', error);
    },
  });

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      onCopy(content, index);

      // Show success toast
      toast.success('Response copied to clipboard!');

      // Track the copy action
      if (historyId) {
        markCopiedMutation.mutate({
          historyId,
          responseId: `response-${index}`,
        });
      }

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleRating = (index: number, rating: number) => {
    setRatings({ ...ratings, [index]: rating });
    onRate(index, rating);

    // Submit rating to backend
    if (historyId) {
      rateResponseMutation.mutate({
        historyId,
        responseId: `response-${index}`,
        rating,
      });
    }
  };

  const handleSelect = (index: number) => {
    onSelect(index);
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'professional':
        return 'bg-blue-100 text-blue-800';
      case 'casual':
        return 'bg-green-100 text-green-800';
      case 'formal':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLengthColor = (length: string) => {
    switch (length) {
      case 'brief':
        return 'bg-orange-100 text-orange-800';
      case 'standard':
        return 'bg-blue-100 text-blue-800';
      case 'detailed':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (responseIndex: number, currentRating: number = 0) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isRated = currentRating >= star;
          const Icon = isRated ? StarIconSolid : StarIcon;
          return (
            <button
              key={star}
              onClick={() => handleRating(responseIndex, star)}
              className={`h-4 w-4 transition-colors ${
                isRated ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {responses.map((response, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === index
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span>Option {index + 1}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getToneColor(response.tone)}`}>
                    {response.tone}
                  </span>
                </div>
                {/* Confidence Score Visualization */}
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getConfidenceColor(response.confidence)} transition-all`}
                      style={{ width: `${Math.round(response.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    {Math.round(response.confidence * 100)}%
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {responses.map((response, index) => (
          <div
            key={index}
            className={activeTab === index ? 'block' : 'hidden'}
          >
            {/* Response content and actions */}
            <div className="space-y-4">
              {/* Tags */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getLengthColor(response.length)}`}>
                  {response.length}
                </span>
                {response.tone && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getToneColor(response.tone)}`}>
                    {response.tone}
                  </span>
                )}
              </div>

              {/* Response text */}
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                  {response.content}
                </div>
              </div>

              {/* AI Reasoning - collapsible */}
              {response.reasoning && (
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={() => setExpandedReasoning({
                      ...expandedReasoning,
                      [index]: !expandedReasoning[index]
                    })}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${expandedReasoning[index] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Why this response?
                  </button>
                  {expandedReasoning[index] && (
                    <div className="mt-3 pl-6 border-l-2 border-green-200">
                      <p className="text-sm text-gray-600">{response.reasoning}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                {/* Rating stars */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Rate:</span>
                  {renderStars(index, ratings[index])}
                </div>

                {/* Copy button */}
                <button
                  onClick={() => handleCopy(response.content, index)}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  {copiedIndex === index ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className="h-4 w-4" />
                      <span>Copy to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {responses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No responses generated yet. Use the form above to generate AI responses.</p>
        </div>
      )}
    </div>
  );
}