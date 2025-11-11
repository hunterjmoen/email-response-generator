import { useState } from 'react';

interface QuickActionsProps {
  onRegenerate: () => void;
  onEditAndRegenerate: (instruction: string) => void;
  isLoading?: boolean;
}

export function QuickActions({ onRegenerate, onEditAndRegenerate, isLoading = false }: QuickActionsProps) {
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');

  const handleEditSubmit = () => {
    if (editInstruction.trim()) {
      onEditAndRegenerate(editInstruction);
      setEditInstruction('');
      setShowEditPrompt(false);
    }
  };

  const quickEditSuggestions = [
    'Make it shorter',
    'Make it more formal',
    'Make it more casual',
    'Add more details',
    'Make it friendlier',
    'Be more direct',
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Quick Actions
      </h3>

      <div className="space-y-2">
        {/* Regenerate Button */}
        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isLoading ? 'Regenerating...' : 'Regenerate Responses'}
        </button>

        {/* Edit & Regenerate */}
        {!showEditPrompt ? (
          <button
            onClick={() => setShowEditPrompt(true)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-green-400 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Tweak & Regenerate
          </button>
        ) : (
          <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              How should we adjust the responses?
            </label>
            <textarea
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              placeholder="e.g., Make it shorter and more direct"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={2}
            />

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {quickEditSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setEditInstruction(suggestion)}
                  className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleEditSubmit}
                disabled={!editInstruction.trim() || isLoading}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Regenerate
              </button>
              <button
                onClick={() => {
                  setShowEditPrompt(false);
                  setEditInstruction('');
                }}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">⌘ R</kbd> to regenerate
        </p>
      </div>
    </div>
  );
}
