import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../utils/supabase';
import { trpc } from '../../utils/trpc';

export default function CheckoutSuccess() {
  const router = useRouter();
  const { session_id } = router.query;
  const [countdown, setCountdown] = useState(5);
  const { isAuthenticated, isLoading, user, initialize } = useAuthStore();
  const [subscriptionRefreshed, setSubscriptionRefreshed] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const verifyCheckout = trpc.stripe.verifyCheckoutSession.useMutation();

  // TEMPORARY: Manually verify and activate subscription for local testing
  // This replaces the webhook flow when STRIPE_WEBHOOK_SECRET is not properly configured
  useEffect(() => {
    if (isAuthenticated && !subscriptionRefreshed && session_id && typeof session_id === 'string') {
      console.log('[Checkout Success] Verifying checkout session:', session_id);

      const verifyAndActivate = async () => {
        try {
          // Call the temporary endpoint to verify and activate the subscription
          await verifyCheckout.mutateAsync({ sessionId: session_id });
          console.log('[Checkout Success] Subscription activated successfully');

          // Refresh user data to get the updated subscription
          await initialize();
          setSubscriptionRefreshed(true);
          console.log('[Checkout Success] User data refreshed, new tier:', useAuthStore.getState().user?.subscription?.tier);
        } catch (error: any) {
          console.error('[Checkout Success] Failed to verify checkout:', error);
          setVerificationError(error.message || 'Failed to activate subscription');
          setSubscriptionRefreshed(true); // Still mark as refreshed to stop loading
        }
      };

      verifyAndActivate();
    }
  }, [isAuthenticated, subscriptionRefreshed, session_id, initialize]);

  // Start countdown only after auth is confirmed and subscription is refreshed
  useEffect(() => {
    if (isLoading || !isAuthenticated || !subscriptionRefreshed) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard/generate');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, isAuthenticated, isLoading, subscriptionRefreshed]);

  // Show loading state while auth is initializing or subscription is being refreshed
  if (isLoading || (isAuthenticated && !subscriptionRefreshed)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-2">
            {isLoading ? 'Loading your account...' : 'Activating your premium subscription...'}
          </p>
          {!isLoading && (
            <p className="text-sm text-gray-500">
              This will only take a moment
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show error if verification failed
  if (verificationError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
              <svg
                className="h-10 w-10 text-yellow-600"
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
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Received
          </h1>
          <p className="text-gray-600 mb-4">
            Your payment was successful, but there was an issue activating your subscription.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">{verificationError}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Please contact support with your session ID below, and we'll activate your subscription manually.
          </p>
          {session_id && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Session ID</p>
              <p className="text-xs font-mono text-gray-700 break-all">
                {session_id}
              </p>
            </div>
          )}
          <div className="space-y-3">
            <Link
              href="/dashboard/generate"
              className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="block w-full text-gray-600 hover:text-gray-800 text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, prompt login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg
                className="h-10 w-10 text-green-600"
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
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-gray-600 mb-2">
            Thank you for your purchase. Your payment has been processed successfully.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please log in to access your premium features.
          </p>
          {session_id && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Session ID</p>
              <p className="text-xs font-mono text-gray-700 break-all">
                {session_id}
              </p>
            </div>
          )}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Log In to Continue
            </Link>
            <Link
              href="/"
              className="block w-full text-gray-600 hover:text-gray-800 text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg
              className="h-10 w-10 text-green-600"
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
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>

        <p className="text-gray-600 mb-4">
          Thank you for your purchase. Your payment has been processed successfully.
        </p>

        {user?.subscription?.tier && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-sm font-medium text-green-800 mb-1">
              Subscription Status
            </p>
            <p className="text-lg font-bold text-green-900 capitalize">
              {user.subscription.tier} Plan
            </p>
            {user.subscription.tier === 'premium' && (
              <p className="text-sm text-green-700 mt-1">
                You now have unlimited access to all features!
              </p>
            )}
          </div>
        )}

        {session_id && (
          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-500 mb-1">Session ID</p>
            <p className="text-xs font-mono text-gray-700 break-all">
              {session_id}
            </p>
          </div>
        )}

        <p className="text-sm text-gray-500 mb-6">
          Redirecting to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>

        <div className="space-y-3">
          <Link
            href="/dashboard/generate"
            className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Start Generating Responses
          </Link>
          <Link
            href="/"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
