import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../stores/auth';

/**
 * This page handles redirects after login when user was trying to checkout
 */
export default function CheckoutCallback() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    // Wait for user to be loaded
    if (user) {
      // Redirect back to pricing page with pending checkout flag
      router.replace('/pricing');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Preparing your checkout...</p>
      </div>
    </div>
  );
}
