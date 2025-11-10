import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterInput } from '@freelance-flow/shared';
import { trpc } from '../../utils/trpc';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../utils/supabase';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const { setAuth } = useAuthStore();
  const registerMutation = trpc.auth.register.useMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const passwordValue = watch('password');

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setPasswordChecks({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    });
  };

  const onSubmit = async (data: RegisterInput) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const result = await registerMutation.mutateAsync(data);

      if (!result.session) {
        console.error('[RegisterForm] No session returned from registration');
        setSubmitError('Registration successful, but failed to log in automatically. Please try logging in manually.');
        return;
      }

      // Update auth store - this now persists to localStorage via middleware
      setAuth(result.user, result.session);

      // Then set the session in Supabase client to store it in cookies
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) {
        console.error('[RegisterForm] Error setting session:', sessionError);
        throw new Error('Failed to establish session. Please try again.');
      }

      setSubmitMessage(result.message);
      onSuccess?.();
    } catch (error: any) {
      console.error('[RegisterForm] Registration error:', error);

      // Provide user-friendly error messages
      if (error.message?.toLowerCase().includes('already registered')) {
        setSubmitError('This email is already registered. Please log in instead.');
      } else if (error.message?.toLowerCase().includes('invalid email')) {
        setSubmitError('Please enter a valid email address.');
      } else if (error.message?.toLowerCase().includes('password')) {
        setSubmitError('Password must be at least 8 characters long.');
      } else {
        setSubmitError(error.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Join FreelanceFlow and streamline your client communications
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  First Name
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Industry (Optional)
              </label>
              <select
                {...register('industry')}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select your industry</option>
                <option value="web-development">Web Development</option>
                <option value="graphic-design">Graphic Design</option>
                <option value="content-writing">Content Writing</option>
                <option value="marketing">Marketing</option>
                <option value="consulting">Consulting</option>
                <option value="photography">Photography</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                {...register('password', {
                  onChange: handlePasswordChange
                })}
                type="password"
                autoComplete="new-password"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Minimum 8 characters"
              />

              {/* Real-time password strength indicator */}
              {passwordValue && (
                <div className="mt-3 space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Password must contain:</p>
                  <ul className="space-y-1.5">
                    <li className={`flex items-center text-xs ${passwordChecks.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <span className="mr-2 font-bold">{passwordChecks.length ? '✓' : '○'}</span>
                      At least 8 characters
                    </li>
                    <li className={`flex items-center text-xs ${passwordChecks.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <span className="mr-2 font-bold">{passwordChecks.uppercase ? '✓' : '○'}</span>
                      One uppercase letter (A-Z)
                    </li>
                    <li className={`flex items-center text-xs ${passwordChecks.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <span className="mr-2 font-bold">{passwordChecks.lowercase ? '✓' : '○'}</span>
                      One lowercase letter (a-z)
                    </li>
                    <li className={`flex items-center text-xs ${passwordChecks.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <span className="mr-2 font-bold">{passwordChecks.number ? '✓' : '○'}</span>
                      One number (0-9)
                    </li>
                    <li className={`flex items-center text-xs ${passwordChecks.special ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <span className="mr-2 font-bold">{passwordChecks.special ? '✓' : '○'}</span>
                      One special character (!@#$%^&*)
                    </li>
                  </ul>
                </div>
              )}

              {errors.password && !passwordValue && (
                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          {submitError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

          {submitMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
              <p className="text-sm text-green-600 dark:text-green-400">{submitMessage}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 text-sm font-medium"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}