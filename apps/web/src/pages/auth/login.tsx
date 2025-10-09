import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { LoginForm } from '../../components/auth/LoginForm';
import { useAuthStore } from '../../stores/auth';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Handle hydration with skipHydration
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirectUrl = (router.query.redirect as string) || '/dashboard';
      router.push(redirectUrl);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <LoginForm
      onSuccess={() => {
        // Success handling is done in the LoginForm component
      }}
      onSwitchToRegister={() => {
        router.push('/auth/register');
      }}
      onSwitchToPasswordReset={() => {
        router.push('/auth/forgot-password');
      }}
    />
  );
}

LoginPage.getLayout = function getLayout(page: React.ReactElement) {
  return <>{page}</>;
};