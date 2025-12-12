import { useState, useCallback } from 'react';

export interface ScopeAlertProps {
  phrases: string[];
  confidence: number;
  onDismiss: () => void;
  onFeedback?: (isCorrect: boolean, phrases: string[]) => void;
}

export function ScopeAlert({ phrases, confidence, onDismiss, onFeedback }: ScopeAlertProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const handleFeedback = useCallback(
    (isCorrect: boolean) => {
      setFeedbackGiven(isCorrect);
      onFeedback?.(isCorrect, phrases);
    },
    [onFeedback, phrases]
  );

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-amber-500 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Scope Creep Detected
            </h4>
            <button
              type="button"
              onClick={onDismiss}
              className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            This message may contain a request for additional work outside the original scope.
          </p>

          {phrases.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Detected phrases:</p>
              <div className="flex flex-wrap gap-1.5">
                {phrases.map((phrase, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200"
                  >
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Confidence: {Math.round(confidence * 100)}%
              </span>
            </div>

            {/* Feedback buttons */}
            {feedbackGiven === null ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-amber-600 dark:text-amber-400 mr-2">
                  Was this correct?
                </span>
                <button
                  type="button"
                  onClick={() => handleFeedback(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(false)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Not scope creep
                </button>
              </div>
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {feedbackGiven ? 'Thanks for confirming!' : 'Thanks, we\'ll improve detection'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
