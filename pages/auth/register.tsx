import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { useAuthStore } from '../../stores/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
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
    <RegisterForm
      onSuccess={() => {
        // Success message is already shown in the form
        // User will be redirected after email verification
      }}
      onSwitchToLogin={() => {
        router.push('/auth/login');
      }}
    />
  );
}

RegisterPage.getLayout = function getLayout(page: React.ReactElement) {
  return <>{page}</>;
};