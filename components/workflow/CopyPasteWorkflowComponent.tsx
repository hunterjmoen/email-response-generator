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
import { supabase } from '../../utils/supabase';

export function CopyPasteWorkflowComponent() {
  const router = useRouter();
  const [promptInput, setPromptInput] = useState('');
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
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

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    if (!isAuthenticated) {
      setError('Please log in to generate responses');
      router.push('/auth/login');
      return;
    }

    handleInputSubmit({
      originalMessage: promptInput,
      context: {
        relationshipStage: 'established',
        projectPhase: 'active',
        urgency: 'standard',
        messageType: 'update',
      },
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPromptInput(suggestion);
  };

  const showInitialView = !currentResponse && !isLoading;

  return (
    <div className="flex h-screen bg-white">
      <aside className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">FL</span>
            </div>
            <span className="text-xl font-semibold">FreelanceFlow</span>
          </Link>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Response Generator
              </button>
            </li>
            <li>
              <Link href="/dashboard/index" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                History
              </Link>
            </li>
            <li>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Templates
              </button>
            </li>
            <li>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Settings
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          {user && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-xs">
                {user.firstName && user.lastName
                  ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                  : user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </p>
                <p className="text-xs text-gray-600 capitalize">
                  {user.subscription?.tier || 'free'} plan
                </p>
              </div>
            </div>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            Log out
          </button>
        </div>
      </aside>

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

        {showInitialView ? (
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
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
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
        ) : (
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
                <MessageInputForm
                  onSubmit={handleInputSubmit}
                  isLoading={isLoading}
                  defaultValues={currentInput || undefined}
                />

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

        <footer className="border-t border-gray-200 py-4 px-6 text-center">
          <div className="flex items-center justify-center gap-8 text-xs text-gray-500">
            <span>curated by <span className="font-semibold">FreelanceFlow</span></span>
          </div>
        </footer>
      </main>
    </div>
  );
}