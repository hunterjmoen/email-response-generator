import { useState, useEffect, useRef } from 'react';
import { CheckIcon, ClipboardIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { trpc } from '../../utils/trpc';
import toast from 'react-hot-toast';

interface StreamingResponse {
  index: number;
  content: string;
  tone: string;
  length: string;
  confidence: number;
  reasoning: string;
  isComplete: boolean;
}

interface StreamingResponseDisplayProps {
  responses: StreamingResponse[];
  onCopy: (content: string, index: number) => void;
  onRate: (index: number, rating: number) => void;
  onSelect: (index: number) => void;
  selectedIndex?: number;
  isStreaming?: boolean;
  historyId?: string;
}

export function StreamingResponseDisplay({
  responses,
  onCopy,
  onRate,
  onSelect,
  selectedIndex,
  isStreaming = false,
  historyId,
}: StreamingResponseDisplayProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [expandedReasoning, setExpandedReasoning] = useState<Record<number, boolean>>({});
  const responseEndRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  // Auto-scroll to the end of currently streaming response
  useEffect(() => {
    if (isStreaming && responses.length > 0) {
      const lastResponseIndex = responses.length - 1;
      const lastResponse = responses[lastResponseIndex];

      if (!lastResponse.isComplete && responseEndRefs.current[lastResponseIndex]) {
        responseEndRefs.current[lastResponseIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [responses, isStreaming]);

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
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'casual':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'formal':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getLengthColor = (length: string) => {
    switch (length) {
      case 'brief':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'standard':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'detailed':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
                isRated ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Chat-like conversation layout */}
      <div className="space-y-6 max-w-4xl mx-auto">
        {responses.map((response, index) => {
          const isSelected = selectedIndex === index;
          const isCopied = copiedIndex === index;
          const isCurrentlyStreaming = isStreaming && !response.isComplete;

          return (
            <div key={index} className="flex items-start gap-3">
              {/* AI Avatar */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-md">
                  AI
                </div>
              </div>

              {/* Message Bubble */}
              <div className="flex-1 space-y-2">
                {/* Response Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Assistant</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Option {index + 1}</span>

                  {/* Streaming indicator */}
                  {isCurrentlyStreaming && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 animate-pulse">
                      <div className="flex gap-0.5">
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span>Writing...</span>
                    </div>
                  )}

                  {/* Confidence Badge (only when complete) */}
                  {response.isComplete && response.confidence > 0 && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      response.confidence >= 0.8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      response.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {Math.round(response.confidence * 100)}%
                    </div>
                  )}

                  {/* Style tags (only when complete) */}
                  {response.isComplete && response.length && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLengthColor(response.length)}`}>
                      {response.length}
                    </span>
                  )}
                  {response.isComplete && response.tone && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getToneColor(response.tone)}`}>
                      {response.tone}
                    </span>
                  )}
                </div>

                {/* Message Content Bubble */}
                <div
                  onClick={() => response.isComplete && handleSelect(index)}
                  className={`group relative rounded-2xl rounded-tl-sm px-5 py-4 transition-all duration-200 ${
                    response.isComplete ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    isSelected
                      ? 'bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 border-2 border-green-400 shadow-lg'
                      : 'bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700' +
                        (response.isComplete ? ' hover:border-green-300 hover:shadow-md' : '')
                  }`}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-lg">
                      <CheckIcon className="h-3 w-3" />
                    </div>
                  )}

                  {/* Response Content */}
                  <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed text-sm">
                    {response.content}
                    {isCurrentlyStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-green-500 animate-pulse"></span>
                    )}
                  </div>

                  {/* Scroll anchor for auto-scroll */}
                  <div ref={(el) => (responseEndRefs.current[index] = el)} />

                  {/* AI Reasoning - collapsible (only when complete) */}
                  {response.isComplete && response.reasoning && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedReasoning({
                            ...expandedReasoning,
                            [index]: !expandedReasoning[index]
                          });
                        }}
                        className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                      >
                        <svg
                          className={`h-3 w-3 transition-transform ${expandedReasoning[index] ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Why this response?
                      </button>
                      {expandedReasoning[index] && (
                        <div className="mt-2 pl-4 border-l-2 border-green-300">
                          <p className="text-xs text-gray-600 dark:text-gray-400">{response.reasoning}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons Row (only when complete) */}
                {response.isComplete && (
                  <div className="flex items-center gap-3 ml-2">
                    {/* Copy Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(response.content, index);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                        isCopied
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-green-400'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardIcon className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* Rating stars */}
                    <div className="flex items-center gap-1">
                      {renderStars(index, ratings[index])}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Progress indicator when streaming */}
        {isStreaming && responses.length < 3 && (
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-gray-500 dark:text-gray-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Preparing response {responses.length + 1} of 3...</span>
          </div>
        )}
      </div>

      {responses.length === 0 && !isStreaming && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No responses generated yet. Use the form above to generate AI responses.</p>
        </div>
      )}
    </div>
  );
}
