import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '../../stores/auth';
import { trpc } from '../../utils/trpc';
import { createClient } from '@supabase/supabase-js';

export default function ProfileSettings() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch user profile with style_profile
  const { data: userProfile, refetch } = trpc.history.getById.useQuery(
    { id: user?.id || '' },
    { enabled: !!user?.id }
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleRecalculateStyle = async () => {
    if (!user) return;

    setIsRecalculating(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-style', {
        body: { userId: user.id },
      });

      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text: 'Your communication style has been successfully recalculated!',
      });

      // Refetch the user profile to get the updated style_profile
      await refetch();
    } catch (error: any) {
      console.error('Failed to recalculate style:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to recalculate style. Please try again.',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleResetStyle = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to reset your learned communication style?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ style_profile: null })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text: 'Your communication style has been reset to default.',
      });

      await refetch();
    } catch (error: any) {
      console.error('Failed to reset style:', error);
      setMessage({
        type: 'error',
        text: 'Failed to reset style. Please try again.',
      });
    }
  };

  // Handle redirect on client side only
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/settings/profile');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const styleProfile = (user as any)?.style_profile;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard/generate" className="flex items-center gap-2 text-gray-900 hover:text-gray-700">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">FL</span>
                </div>
                <span className="text-xl font-semibold">FreelanceFlow</span>
              </Link>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/dashboard/generate" className="text-sm text-gray-700 hover:text-gray-900">
                Generator
              </Link>
              <Link href="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">
                History
              </Link>
              <Link href="/settings/profile" className="text-sm font-medium text-green-600">
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your profile and communication style preferences
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* User Info Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">Email:</span>
              <span className="ml-2 text-sm text-gray-900">{user?.email}</span>
            </div>
            {user?.firstName && (
              <div>
                <span className="text-sm font-medium text-gray-700">Name:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-700">Plan:</span>
              <span className="ml-2 text-sm text-gray-900 capitalize">
                {(user as any)?.subscription?.tier || 'free'}
              </span>
            </div>
          </div>
        </div>

        {/* Learned Communication Style Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Learned Communication Style</h2>
            {styleProfile && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-6">
            FreelanceFlow learns from your highly-rated and copied responses to match your unique
            communication style when generating new responses.
          </p>

          {styleProfile ? (
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Style Summary</h3>
                <p className="text-sm text-gray-700">{styleProfile.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">Formality</h4>
                  <p className="text-sm text-gray-900 capitalize">{styleProfile.formality}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">Tone</h4>
                  <p className="text-sm text-gray-900 capitalize">{styleProfile.tone}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">
                    Sentence Complexity
                  </h4>
                  <p className="text-sm text-gray-900 capitalize">
                    {styleProfile.sentenceComplexity}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">
                    Emoji Usage
                  </h4>
                  <p className="text-sm text-gray-900">
                    {styleProfile.emojiUsage ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {styleProfile.commonPhrases && styleProfile.commonPhrases.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                    Common Phrases
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {styleProfile.commonPhrases.map((phrase: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {styleProfile.structuralHabits && styleProfile.structuralHabits.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                    Structural Habits
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {styleProfile.structuralHabits.map((habit: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700">
                        {habit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                No communication style learned yet. Rate responses highly (4-5 stars) or copy
                responses to help FreelanceFlow learn your style. You need at least 5 high-quality
                responses to generate a style profile.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleRecalculateStyle}
              disabled={isRecalculating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isRecalculating ? 'Recalculating...' : 'Recalculate My Style'}
            </button>

            {styleProfile && (
              <button
                onClick={handleResetStyle}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
              >
                Reset My Style
              </button>
            )}
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Style analysis is performed automatically when you rate responses 4-5 stars or copy
            responses. Manual recalculation analyzes your recent high-quality responses.
          </p>
        </div>
      </main>
    </div>
  );
}
