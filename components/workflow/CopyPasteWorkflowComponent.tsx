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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
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
    setShowAdvancedOptions(false);
  }, [setCurrentInput, setCurrentResponse, setSelectedResponseIndex, setError]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCopy: () => {
      if (selectedResponseIndex !== null && responseOptions[selectedResponseIndex]) {
        handleCopy(responseOptions[selectedResponseIndex].content, selectedResponseIndex);
      }
    },
    onNew: handleStartNew,
    onSubmit: () => {},
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
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <DashboardSidebar user={user} />

      <main className="flex-1 flex flex-col">
        <header className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold dark:text-gray-100">FreelanceFlow</h1>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {isAuthenticated ? (
              <UserProfileMenu />
            ) : (
              <button
                onClick={() => router.push('/auth/login')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Log in
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Single-page workflow */}
            {!currentResponse && !isLoading && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Generate AI Response</h2>
                  <p className="text-gray-600 dark:text-gray-400">Paste your client's message and get professional responses instantly</p>
                </div>

                {!isAuthenticated && (
                  <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Please <Link href="/auth/login" className="font-medium underline hover:text-yellow-900 dark:hover:text-yellow-200">log in</Link> to generate responses.
                    </p>
                  </div>
                )}

                {/* Integrated form with collapsible advanced options */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <MessageInputForm
                    onSubmit={handleInputSubmit}
                    isLoading={isLoading}
                    defaultValues={{
                      originalMessage: '',
                      context: {
                        urgency: 'standard',
                        messageType: 'update',
                        relationshipStage: 'established',
                        projectPhase: 'active',
                      }
                    }}
                  />
                </div>
              </>
            )}

            {/* Error display */}
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Generation Error</h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                      <p>{error}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Results section */}
            {(responseOptions.length > 0 || isLoading) && (
              <div className="space-y-6">
                {/* Chat-like header with New Response button */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conversation</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose the response that fits your style</p>
                  </div>
                  {!isLoading && (
                    <button
                      onClick={handleStartNew}
                      className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-colors flex items-center gap-2 font-medium shadow-sm"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Conversation
                    </button>
                  )}
                </div>

                {/* Client Message Display - Incoming message style */}
                {currentInput && (
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-start gap-3">
                      {/* Client Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold shadow-md">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>

                      {/* Client Message Bubble */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Client</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Just now</span>
                        </div>

                        <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                          <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed text-sm">
                            {currentInput.originalMessage}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Divider with "AI Suggestions" label */}
                {currentInput && !isLoading && (
                  <div className="max-w-4xl mx-auto flex items-center gap-3 py-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Suggestions</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                )}

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
          </div>
        </div>

        {/* Keyboard Shortcuts Help Button */}
        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            title="Keyboard shortcuts"
          >
            <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          {showKeyboardHelp && (
            <div className="absolute bottom-full left-0 mb-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-72">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h4>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600 dark:text-gray-400">Copy response</dt>
                  <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">⌘ C</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600 dark:text-gray-400">New response</dt>
                  <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">⌘ N</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600 dark:text-gray-400">Submit form</dt>
                  <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">⌘ ↵</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600 dark:text-gray-400">Next option</dt>
                  <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">→</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600 dark:text-gray-400">Previous option</dt>
                  <dd className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">←</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}