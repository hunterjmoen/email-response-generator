import { useState, useCallback } from 'react';

interface ToneFingerprint {
  formality: 'casual' | 'neutral' | 'formal';
  brevity: 'terse' | 'moderate' | 'verbose';
  emojiUsage: boolean;
  greetingStyle: 'none' | 'casual' | 'formal';
  signOffStyle: 'none' | 'casual' | 'formal';
  vocabularyLevel: 'simple' | 'moderate' | 'sophisticated';
  avgSentenceLength: number;
  sampleCount: number;
  lastUpdated: string;
}

interface TonePrintShowcaseProps {
  clientName: string;
  fingerprint: ToneFingerprint;
  onFeedback?: (liked: boolean) => void;
}

function getToneDescription(fingerprint: ToneFingerprint): string {
  const parts: string[] = [];

  if (fingerprint.formality === 'casual') {
    parts.push('casual');
  } else if (fingerprint.formality === 'formal') {
    parts.push('formal');
  }

  if (fingerprint.brevity === 'terse') {
    parts.push('concise');
  } else if (fingerprint.brevity === 'verbose') {
    parts.push('detailed');
  }

  if (parts.length === 0) {
    return 'balanced';
  }

  return parts.join(', ');
}

export function TonePrintShowcase({
  clientName,
  fingerprint,
  onFeedback,
}: TonePrintShowcaseProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const handleFeedback = useCallback(
    (liked: boolean) => {
      setFeedbackGiven(liked);
      onFeedback?.(liked);
    },
    [onFeedback]
  );

  const toneDescription = getToneDescription(fingerprint);

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* TonePrint Icon */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800/50 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200">
              TonePrint Active
            </h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300">
              {fingerprint.sampleCount} sample{fingerprint.sampleCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
            Responses matched to <span className="font-medium">{clientName}</span>'s{' '}
            <span className="font-medium">{toneDescription}</span> style
          </p>

          {/* Style Indicators */}
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Formality */}
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">
              <span className="text-gray-500 dark:text-gray-400">Tone:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                {fingerprint.formality}
              </span>
            </div>

            {/* Message length */}
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">
              <span className="text-gray-500 dark:text-gray-400">Length:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                {fingerprint.brevity}
              </span>
            </div>

            {/* Emoji */}
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">
              <span className="text-gray-500 dark:text-gray-400">Emojis:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {fingerprint.emojiUsage ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          {/* Feedback Section */}
          {feedbackGiven === null ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-purple-600 dark:text-purple-400">
                Does this sound like you?
              </span>
              <button
                onClick={() => handleFeedback(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
                Yes
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="inline-flex items-center gap-1 px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                  />
                </svg>
                No
              </button>
            </div>
          ) : (
            <p className="text-xs text-purple-600 dark:text-purple-400">
              {feedbackGiven
                ? 'Great! Tone matching is working well.'
                : 'Thanks! We\'ll improve tone matching.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
