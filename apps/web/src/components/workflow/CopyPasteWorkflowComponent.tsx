import { useCallback } from 'react';
import { MessageInputForm } from './MessageInputForm';
import { ResponseDisplay } from './ResponseDisplay';
import { useResponseGenerationStore, useCurrentResponseOptions } from '../../stores/response-generation';
import { trpc } from '../../utils/trpc';
import { type ValidatedMessageInput } from '@freelance-flow/shared';

export function CopyPasteWorkflowComponent() {
  const {
    currentInput,
    currentResponse,
    selectedResponseIndex,
    isLoading,
    error,
    setCurrentInput,
    setCurrentResponse,
    setSelectedResponseIndex,
    setLoading,
    setError,
    addToHistory,
    setCopiedResponseIndex,
  } = useResponseGenerationStore();

  const responseOptions = useCurrentResponseOptions();

  // tRPC mutations
  const generateMutation = trpc.responses.generate.useMutation({
    onSuccess: (data) => {
      setCurrentResponse(data.response);
      addToHistory(data.response);
      setLoading(false);
    },
    onError: (error) => {
      setError(error.message);
      setLoading(false);
    },
  });

  const feedbackMutation = trpc.responses.submitFeedback.useMutation({
    onError: (error) => {
      console.error('Failed to submit feedback:', error);
    },
  });

  const handleInputSubmit = useCallback(
    async (input: ValidatedMessageInput) => {
      setCurrentInput(input);
      setLoading(true);

      try {
        await generateMutation.mutateAsync(input);
      } catch (error) {
        // Error is handled by the mutation's onError callback
        console.error('Generation failed:', error);
      }
    },
    [generateMutation, setCurrentInput, setLoading]
  );

  const handleCopy = useCallback(
    (content: string, index: number) => {
      setCopiedResponseIndex(index);

      // Automatically select the copied response
      if (selectedResponseIndex !== index) {
        setSelectedResponseIndex(index);
      }

      // Submit feedback if we have a current response
      if (currentResponse) {
        feedbackMutation.mutate({
          historyId: currentResponse.historyId,
          selectedResponse: index,
        });
      }

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedResponseIndex(null);
      }, 2000);
    },
    [
      currentResponse,
      selectedResponseIndex,
      setCopiedResponseIndex,
      setSelectedResponseIndex,
      feedbackMutation,
    ]
  );

  const handleRate = useCallback(
    (index: number, rating: number) => {
      if (currentResponse) {
        feedbackMutation.mutate({
          historyId: currentResponse.historyId,
          selectedResponse: index,
          rating,
        });
      }
    },
    [currentResponse, feedbackMutation]
  );

  const handleSelect = useCallback(
    (index: number) => {
      setSelectedResponseIndex(index);

      if (currentResponse) {
        feedbackMutation.mutate({
          historyId: currentResponse.historyId,
          selectedResponse: index,
        });
      }
    },
    [currentResponse, setSelectedResponseIndex, feedbackMutation]
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Response Generator
        </h1>
        <p className="text-gray-600">
          Paste your client's message and get professional response options instantly.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Generation Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-sm font-medium text-red-800 underline hover:text-red-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Input Form */}
        <MessageInputForm
          onSubmit={handleInputSubmit}
          isLoading={isLoading}
          defaultValues={currentInput || undefined}
        />

        {/* Response Display */}
        {(responseOptions.length > 0 || isLoading) && (
          <div>
            <ResponseDisplay
              responses={responseOptions}
              onCopy={handleCopy}
              onRate={handleRate}
              onSelect={handleSelect}
              selectedIndex={selectedResponseIndex || undefined}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Success Message */}
        {currentResponse && selectedResponseIndex !== null && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Response Ready!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Your selected response has been copied to the clipboard and is ready to use.
                    You can now paste it into your email or messaging platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Progress Indicator */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Progress</h3>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentInput ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`h-3 w-3 rounded-full ${currentInput ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">Message Input</span>
            </div>
            <div className="flex-1 border-t border-gray-300"></div>
            <div className={`flex items-center space-x-2 ${currentResponse ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`h-3 w-3 rounded-full ${currentResponse ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">AI Generation</span>
            </div>
            <div className="flex-1 border-t border-gray-300"></div>
            <div className={`flex items-center space-x-2 ${selectedResponseIndex !== null ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`h-3 w-3 rounded-full ${selectedResponseIndex !== null ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">Selection & Copy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}