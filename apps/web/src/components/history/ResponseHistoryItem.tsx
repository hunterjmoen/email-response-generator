import { useState } from 'react';
import {
  ClipboardIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  StarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { type HistorySearchResult } from '@freelance-flow/shared';

interface ResponseHistoryItemProps {
  item: HistorySearchResult;
  onCopy: (content: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onSelect: (id: string, selected: boolean) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

export function ResponseHistoryItem({
  item,
  onCopy,
  onDelete,
  onView,
  onSelect,
  isSelected = false,
  showActions = true,
}: ResponseHistoryItemProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      const selectedContent = item.selectedResponse !== undefined
        ? item.generatedOptions[item.selectedResponse]?.content
        : item.generatedOptions[0]?.content;

      if (selectedContent) {
        await navigator.clipboard.writeText(selectedContent);
        setCopied(true);
        onCopy(selectedContent);

        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleToggleSelect = () => {
    onSelect(item.id, !isSelected);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
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

    const typeColors = colors[type as keyof typeof colors];
    if (typeColors && typeof typeColors === 'object') {
      return (typeColors as Record<string, string>)[value] || 'bg-gray-100 text-gray-800';
    }
    return 'bg-gray-100 text-gray-800';
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
              className={`h-3 w-3 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
            />
          );
        })}
      </div>
    );
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className={`bg-white rounded-lg border transition-all ${
      isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {showActions && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleToggleSelect}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            )}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <CalendarIcon className="h-4 w-4" />
              <span>{formatDate(item.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {item.userRating && renderStars(item.userRating)}
            <span className="text-xs text-gray-500">
              {item.generatedOptions.length} option{item.generatedOptions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Context badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {item.context.urgency && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              getContextBadgeColor('urgency', item.context.urgency)
            }`}>
              {item.context.urgency.replace('_', ' ')}
            </span>
          )}
          {item.context.messageType && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              getContextBadgeColor('messageType', item.context.messageType)
            }`}>
              {item.context.messageType.replace('_', ' ')}
            </span>
          )}
          {item.context.projectPhase && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {item.context.projectPhase.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Original message */}
        <div className="mb-3">
          <div className="text-sm text-gray-600 mb-1">Original Message:</div>
          <div className="text-sm text-gray-900">
            {item.snippet ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: item.snippet.replace(
                    new RegExp(`(${item.snippet.match(/\.\.\.(.*?)\.\.\./)?.[1] || ''})`, 'gi'),
                    '<mark class="bg-yellow-200">$1</mark>'
                  )
                }}
              />
            ) : (
              <>
                {expanded ? item.originalMessage : truncateText(item.originalMessage)}
                {item.originalMessage.length > 120 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                  >
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Selected response preview */}
        {item.selectedResponse !== undefined && item.generatedOptions[item.selectedResponse] && (
          <div className="mb-3 p-3 bg-blue-50 rounded-md">
            <div className="text-xs font-medium text-blue-700 mb-1">Selected Response:</div>
            <div className="text-sm text-blue-900">
              {truncateText(item.generatedOptions[item.selectedResponse].content, 100)}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onView(item.id)}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <EyeIcon className="h-3 w-3" />
                <span>View Details</span>
              </button>

              <button
                onClick={handleCopy}
                disabled={!item.generatedOptions.length}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-3 w-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <ClipboardIcon className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => onDelete(item.id)}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
            >
              <TrashIcon className="h-3 w-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}