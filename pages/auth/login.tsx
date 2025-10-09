import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../../stores/auth';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    // Initialize auth on mount
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Only redirect if authenticated
    if (!isLoading && isAuthenticated) {
      const redirectUrl = decodeURIComponent((router.query.redirect as string) || '/dashboard/generate');
      router.replace(redirectUrl);
    } else if (!isLoading && !isAuthenticated) {
      // Not authenticated, redirect to home where they can use LoginModal
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

LoginPage.getLayout = function getLayout(page: React.ReactElement) {
  return <>{page}</>;
};