import { useState, useCallback, useMemo } from 'react';
import type { ChangeOrderLineItem } from '@freelance-flow/shared';

interface LineItemInput {
  id: string;
  description: string;
  hours: string;
  rate: string;
}

interface ChangeOrderBuilderProps {
  originalMessage: string;
  detectedPhrases?: string[];
  defaultRate?: number;
  onGenerate: (data: {
    title: string;
    description: string;
    lineItems: { description: string; hours: number; rate: number }[];
    additionalTimelineDays: number;
    subtotal: number;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ChangeOrderBuilder({
  originalMessage,
  detectedPhrases = [],
  defaultRate = 100,
  onGenerate,
  onCancel,
  isLoading = false,
}: ChangeOrderBuilderProps) {
  // Generate initial title from detected phrases
  const defaultTitle = useMemo(() => {
    if (detectedPhrases.length > 0) {
      return `Additional work: ${detectedPhrases[0]}`;
    }
    return 'Additional scope request';
  }, [detectedPhrases]);

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [additionalDays, setAdditionalDays] = useState(0);
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    {
      id: `item_${Date.now()}`,
      description: detectedPhrases[0] || 'Additional work item',
      hours: '1',
      rate: defaultRate.toString(),
    },
  ]);

  // Calculate subtotal
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const hours = parseFloat(item.hours) || 0;
      const rate = parseFloat(item.rate) || 0;
      return sum + hours * rate;
    }, 0);
  }, [lineItems]);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        description: '',
        hours: '1',
        rate: defaultRate.toString(),
      },
    ]);
  }, [defaultRate]);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateLineItem = useCallback(
    (id: string, field: keyof LineItemInput, value: string) => {
      setLineItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const validLineItems = lineItems
        .filter((item) => item.description.trim() !== '')
        .map((item) => ({
          description: item.description,
          hours: parseFloat(item.hours) || 0,
          rate: parseFloat(item.rate) || 0,
        }));

      if (validLineItems.length === 0) {
        return;
      }

      onGenerate({
        title,
        description,
        lineItems: validLineItems,
        additionalTimelineDays: additionalDays,
        subtotal,
      });
    },
    [title, description, lineItems, additionalDays, subtotal, onGenerate]
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Create Change Order
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Turn this scope request into a professional response with pricing
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Detected Phrases Alert */}
        {detectedPhrases.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              Detected scope expansion:
            </p>
            <div className="flex flex-wrap gap-2">
              {detectedPhrases.map((phrase, index) => (
                <span
                  key={index}
                  className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 rounded"
                >
                  "{phrase}"
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label
            htmlFor="co-title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Title
          </label>
          <input
            id="co-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Brief description of additional work"
            required
          />
        </div>

        {/* Description (optional) */}
        <div>
          <label
            htmlFor="co-description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="co-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            placeholder="Additional context about this change order..."
          />
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Line Items
            </label>
            <button
              type="button"
              onClick={addLineItem}
              className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
            >
              + Add item
            </button>
          </div>

          <div className="space-y-3">
            {/* Header row */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Hours</div>
              <div className="col-span-2 text-center">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>

            {/* Line items */}
            {lineItems.map((item, index) => {
              const amount =
                (parseFloat(item.hours) || 0) * (parseFloat(item.rate) || 0);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg"
                >
                  {/* Description */}
                  <div className="col-span-12 sm:col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, 'description', e.target.value)
                      }
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Work description"
                      required
                    />
                  </div>

                  {/* Hours */}
                  <div className="col-span-4 sm:col-span-2">
                    <div className="flex items-center">
                      <span className="sm:hidden text-xs text-gray-500 mr-2">
                        Hrs:
                      </span>
                      <input
                        type="number"
                        value={item.hours}
                        onChange={(e) =>
                          updateLineItem(item.id, 'hours', e.target.value)
                        }
                        min="0"
                        step="0.5"
                        className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  {/* Rate */}
                  <div className="col-span-4 sm:col-span-2">
                    <div className="flex items-center">
                      <span className="sm:hidden text-xs text-gray-500 mr-1">
                        $
                      </span>
                      <span className="hidden sm:inline text-gray-500 dark:text-gray-400 mr-1">
                        $
                      </span>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) =>
                          updateLineItem(item.id, 'rate', e.target.value)
                        }
                        min="0"
                        step="1"
                        className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  {/* Amount + Delete */}
                  <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      ${amount.toFixed(2)}
                    </span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Impact */}
        <div>
          <label
            htmlFor="co-days"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Timeline Impact
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">+</span>
            <input
              id="co-days"
              type="number"
              value={additionalDays}
              onChange={(e) => setAdditionalDays(parseInt(e.target.value) || 0)}
              min="0"
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <span className="text-gray-600 dark:text-gray-400">
              {additionalDays === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        {/* Subtotal */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Subtotal
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ${subtotal.toFixed(2)}
            </span>
          </div>
          {additionalDays > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Timeline extension: +{additionalDays}{' '}
              {additionalDays === 1 ? 'day' : 'days'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || lineItems.every((item) => !item.description.trim())}
            className="px-6 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate Response
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
