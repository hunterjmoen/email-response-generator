import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabase';
import { useAuthStore } from '../../stores/auth';

export default function AuthCallback() {
  const router = useRouter();
  const { initialize } = useAuthStore();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback from Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/auth/login?error=Authentication failed');
          return;
        }

        if (data.session) {
          // Initialize auth store with the new session
          await initialize();
          router.push('/dashboard');
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        router.push('/auth/login?error=Authentication failed');
      }
    };

    // Only run if we have the router ready
    if (router.isReady) {
      handleAuthCallback();
    }
  }, [router.isReady, router, initialize]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
}

AuthCallback.getLayout = function getLayout(page: React.ReactElement) {
  return <>{page}</>;
};