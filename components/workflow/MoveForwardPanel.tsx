import { useState, useCallback } from 'react';
import { trpc } from '../../utils/trpc';

interface MoveForwardPanelProps {
  onResponseGenerated?: (response: string) => void;
  clientId?: string;
}

type PanelState = 'input' | 'response';

export function MoveForwardPanel({
  onResponseGenerated,
  clientId,
}: MoveForwardPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>('input');
  const [originalMessage, setOriginalMessage] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);

  const generateMutation = trpc.responses.generateMoveForwardResponse.useMutation();

  const handleGenerate = useCallback(async () => {
    if (!originalMessage.trim()) return;

    setGenerateError(null);

    try {
      const result = await generateMutation.mutateAsync({
        originalMessage,
        projectContext: projectContext || undefined,
        clientId,
      });

      setGeneratedResponse(result.response);
      setPanelState('response');
      onResponseGenerated?.(result.response);
    } catch (error: any) {
      console.error('Failed to generate response:', error);
      setGenerateError(error.message || 'Failed to generate response');
    }
  }, [originalMessage, projectContext, clientId, generateMutation, onResponseGenerated]);

  const handleCopyResponse = useCallback(() => {
    navigator.clipboard.writeText(generatedResponse);
  }, [generatedResponse]);

  const handleStartNew = useCallback(() => {
    setPanelState('input');
    setOriginalMessage('');
    setProjectContext('');
    setGeneratedResponse('');
    setGenerateError(null);
  }, []);

  // Input state
  if (panelState === 'input') {
    return (
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                Move Forward
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Generate responses that clarify requirements, confirm timelines, and propose
                concrete next steps.
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            {/* Client Message */}
            <div>
              <label
                htmlFor="mf-message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Client Message
              </label>
              <textarea
                id="mf-message"
                value={originalMessage}
                onChange={(e) => setOriginalMessage(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                placeholder="Paste the client message here..."
              />
            </div>

            {/* Project Context (optional) */}
            <div>
              <label
                htmlFor="mf-context"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Project Context <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="mf-context"
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                placeholder="Any relevant context about the project or what you're working on..."
              />
            </div>

            {/* Error */}
            {generateError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-300">{generateError}</p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!originalMessage.trim() || generateMutation.isPending}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generateMutation.isPending ? (
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  Generate Next Steps Response
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Response state
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Response Generated
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Copy and send to your client
              </p>
            </div>
          </div>
          <button
            onClick={handleStartNew}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Start new
          </button>
        </div>
      </div>

      {/* Response Content */}
      <div className="p-6">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {generatedResponse}
          </p>
        </div>

        <button
          onClick={handleCopyResponse}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy Response
        </button>
      </div>
    </div>
  );
}
