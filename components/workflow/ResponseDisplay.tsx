import { useState } from 'react';
import { type AIResponseOptions } from '@freelance-flow/shared';
import { CheckIcon, ClipboardIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface ResponseDisplayProps {
  responses: AIResponseOptions[];
  onCopy: (content: string, index: number) => void;
  onRate: (index: number, rating: number) => void;
  onSelect: (index: number) => void;
  selectedIndex?: number;
  isLoading?: boolean;
}

export function ResponseDisplay({
  responses,
  onCopy,
  onRate,
  onSelect,
  selectedIndex,
  isLoading = false,
}: ResponseDisplayProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>({});

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      onCopy(content, index);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleRating = (index: number, rating: number) => {
    setRatings({ ...ratings, [index]: rating });
    onRate(index, rating);
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        AI Response Options ({responses.length})
      </h3>

      {responses.map((response, index) => (
        <div
          key={index}
          className={`bg-white rounded-lg border p-6 transition-all ${
            selectedIndex === index
              ? 'border-blue-500 ring-2 ring-blue-200'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">
                Option {index + 1}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getToneColor(response.tone)}`}>
                {response.tone}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLengthColor(response.length)}`}>
                {response.length}
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Confidence:</span>
                <span className="text-xs font-medium text-gray-900">
                  {Math.round(response.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {renderStars(index, ratings[index])}
            </div>
          </div>

          <div className="prose prose-sm max-w-none mb-4">
            <div className="whitespace-pre-wrap text-gray-900">
              {response.content}
            </div>
          </div>

          {response.reasoning && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <span className="text-xs font-medium text-gray-700">AI Reasoning: </span>
              <span className="text-xs text-gray-600">{response.reasoning}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => handleSelect(index)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedIndex === index
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {selectedIndex === index ? 'Selected' : 'Select This Response'}
            </button>

            <button
              onClick={() => handleCopy(response.content, index)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm font-medium"
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
      ))}

      {responses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No responses generated yet. Use the form above to generate AI responses.</p>
        </div>
      )}
    </div>
  );
}