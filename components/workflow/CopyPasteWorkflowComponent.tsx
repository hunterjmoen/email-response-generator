import { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { MessageInputForm } from './MessageInputForm';
import { ResponseDisplay } from './ResponseDisplay';
import { useResponseGenerationStore, useCurrentResponseOptions } from '../../stores/response-generation';
import { useAuthStore } from '../../stores/auth';
import { trpc } from '../../utils/trpc';
import { type ValidatedMessageInput } from '@freelance-flow/shared';
import { UserProfileMenu } from '../UserProfileMenu';
import { DashboardSidebar } from '../navigation/DashboardSidebar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export function CopyPasteWorkflowComponent() {
  const router = useRouter();
  const [promptInput, setPromptInput] = useState('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<'input' | 'context' | 'results'>('input');
  const [draftMessage, setDraftMessage] = useState('');
  const { user, isAuthenticated, isLoading: authLoading, refreshSubscription } = useAuthStore();
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

  const generateMutation = trpc.responses.generate.useMutation({
    onSuccess: async (data) => {
      setCurrentResponse(data.response);
      addToHistory(data.response);
      setLoading(false);
      // Refresh subscription data to update usage count
      await refreshSubscription();
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
      if (!isAuthenticated) {
        setError('Please log in to generate responses');
        router.push('/auth/login');
        return;
      }

      setWorkflowStep('results');
      setCurrentInput(input);
      setLoading(true);

      try {
        await generateMutation.mutateAsync(input);
      } catch (error) {
        console.error('Generation failed:', error);
      }
    },
    [generateMutation, setCurrentInput, setLoading, isAuthenticated, setError, router]
  );

  const handleCopy = useCallback(
    (content: string, index: number) => {
      setCopiedResponseIndex(index);

      if (selectedResponseIndex !== index) {
        setSelectedResponseIndex(index);
      }

      if (currentResponse) {
        feedbackMutation.mutate({
          historyId: currentResponse.historyId,
          selectedResponse: index,
        });
      }

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

  const handleStartNew = useCallback(() => {
    setCurrentInput(null);
    setCurrentResponse(null);
    setSelectedResponseIndex(null);
    setError(null);
    setPromptInput('');
    setDraftMessage('');
    setWorkflowStep('input');
  }, [setCurrentInput, setCurrentResponse, setSelectedResponseIndex, setError]);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    if (!isAuthenticated) {
      setError('Please log in to generate responses');
      router.push('/auth/login');
      return;
    }

    // Move to context step instead of generating immediately
    setDraftMessage(promptInput);
    setWorkflowStep('context');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPromptInput(suggestion);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCopy: () => {
      if (selectedResponseIndex !== null && responseOptions[selectedResponseIndex]) {
        handleCopy(responseOptions[selectedResponseIndex].content, selectedResponseIndex);
      }
    },
    onNew: handleStartNew,
    onSubmit: () => {
      if (promptInput.trim() && isAuthenticated) {
        handlePromptSubmit(new Event('submit') as any);
      }
    },
    onNext: () => {
      if (responseOptions.length > 0) {
        const nextIndex = selectedResponseIndex === null ? 0 :
          (selectedResponseIndex + 1) % responseOptions.length;
        setSelectedResponseIndex(nextIndex);
      }
    },
    onPrevious: () => {
      if (responseOptions.length > 0) {
        const prevIndex = selectedResponseIndex === null ? responseOptions.length - 1 :
          (selectedResponseIndex - 1 + responseOptions.length) % responseOptions.length;
        setSelectedResponseIndex(prevIndex);
      }
    },
  });

  return (
    <div className="flex h-screen bg-white">
      <DashboardSidebar user={user} />

      <main className="flex-1 flex flex-col">
        <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">FreelanceFlow</h1>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {isAuthenticated ? (
              <UserProfileMenu />
            ) : (
              <button
                onClick={() => router.push('/auth/login')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Log in
              </button>
            )}
          </div>
        </header>

        {workflowStep === 'input' && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
            <h2 className="text-3xl font-semibold text-gray-900 mb-8">What can I help with?</h2>
            {!isAuthenticated && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please <Link href="/auth/login" className="font-medium underline hover:text-yellow-900">log in</Link> to generate responses.
                </p>
              </div>
            )}

            <form onSubmit={handlePromptSubmit} className="w-full max-w-2xl mb-6">
              <div className="relative">
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Paste your client's message here..."
                  className="w-full px-4 py-3 pr-12 pb-8 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  maxLength={2000}
                />
                <div className="absolute left-4 bottom-3 text-xs text-gray-500">
                  {promptInput.length}/2000 characters
                </div>
                <button
                  type="submit"
                  disabled={!promptInput.trim() || !isAuthenticated}
                  className="absolute right-3 bottom-3 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
              <button
                onClick={() => handleSuggestionClick("Can we extend the deadline by 2 days?")}
                className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
              >
                Deadline Extension
              </button>
              <button
                onClick={() => handleSuggestionClick("Need to discuss scope changes")}
                className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
              >
                Scope Discussion
              </button>
              <button
                onClick={() => handleSuggestionClick("Following up on payment")}
                className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
              >
                Payment Follow-up
              </button>
              <button
                onClick={() => handleSuggestionClick("Weekly project update")}
                className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
              >
                Project Update
              </button>
            </div>

            <div className="mt-12 text-center text-xs text-gray-500">
              ↓ Scroll to explore
            </div>
          </div>
        )}

        {workflowStep === 'context' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <button
                  onClick={() => {
                    setWorkflowStep('input');
                    setPromptInput(draftMessage);
                  }}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to message
                </button>
              </div>

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Review Your Message</h3>
                <p className="text-sm text-blue-700 italic">"{draftMessage}"</p>
              </div>

              <MessageInputForm
                onSubmit={handleInputSubmit}
                isLoading={false}
                defaultValues={{
                  originalMessage: draftMessage,
                  context: {
                    urgency: 'standard',
                    messageType: 'update',
                    relationshipStage: 'established',
                    projectPhase: 'active',
                  }
                }}
              />
            </div>
          </div>
        )}

        {workflowStep === 'results' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Generation Error</h3>
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
                {(responseOptions.length > 0 || isLoading) && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">AI Response Options</h2>
                      {!isLoading && (
                        <button
                          onClick={handleStartNew}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          New Response
                        </button>
                      )}
                    </div>

                    <ResponseDisplay
                      responses={responseOptions}
                      onCopy={handleCopy}
                      onRate={handleRate}
                      onSelect={handleSelect}
                      selectedIndex={selectedResponseIndex || undefined}
                      isLoading={isLoading}
                      historyId={currentResponse?.historyId}
                    />
                  </div>
                )}

                {currentResponse && selectedResponseIndex !== null && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Response Ready!</h3>
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
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help Button */}
        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="p-3 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-all"
            title="Keyboard shortcuts"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          {showKeyboardHelp && (
            <div className="absolute bottom-full left-0 mb-2 p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-72">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Keyboard Shortcuts</h4>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600">Copy response</dt>
                  <dd className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300">⌘ C</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600">New response</dt>
                  <dd className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300">⌘ N</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600">Submit form</dt>
                  <dd className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300">⌘ ↵</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600">Next option</dt>
                  <dd className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300">→</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600">Previous option</dt>
                  <dd className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300">←</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}