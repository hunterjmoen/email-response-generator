import { useRouter } from 'next/router';
import { PasswordResetForm } from '../../components/auth/PasswordResetForm';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <PasswordResetForm
      onSuccess={() => {
        // Success message is already shown in the form
      }}
      onBackToLogin={() => {
        router.push('/auth/login');
      }}
    />
  );
}

ForgotPasswordPage.getLayout = function getLayout(page: React.ReactElement) {
  return <>{page}</>;
};