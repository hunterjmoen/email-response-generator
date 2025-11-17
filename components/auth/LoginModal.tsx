import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, RegisterSchema, type LoginInput, type RegisterInput } from '@freelance-flow/shared';
import { trpc } from '../../utils/trpc';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function LoginModal({ isOpen, onClose, initialMode = 'login' }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Sync mode with initialMode when modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { setAuth } = useAuthStore();
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const loginFormData = loginForm;
  const registerFormData = registerForm;

  const { register, handleSubmit, formState: { errors } } = mode === 'login' ? loginFormData : registerFormData;

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setSubmitError(`Failed to sign in with ${provider}`);
      }
    } catch (error) {
      setSubmitError(`Failed to sign in with ${provider}`);
    }
  };

  const onLoginSubmit = async (data: LoginInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('[LoginModal] Starting login...');

      // Create a timeout promise to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 30000);
      });

      // Race between the login mutation and timeout
      const result = await Promise.race([
        loginMutation.mutateAsync(data),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof loginMutation.mutateAsync>>;

      console.log('[LoginModal] Login successful, result:', result);

      // Update Zustand store - this now persists to localStorage via middleware
      setAuth(result.user, result.session);
      console.log('[LoginModal] Auth state updated in Zustand store');

      // IMPORTANT: Set the session in Supabase client to store it in cookies
      // This allows the server to read the session from cookies for authentication
      // We do this AFTER setAuth to avoid the onAuthStateChange listener from re-fetching user data
      if (result.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });

        if (sessionError) {
          console.error('[LoginModal] Error setting session:', sessionError);
          throw new Error('SESSION_ERROR');
        }
        console.log('[LoginModal] Session set in Supabase client (cookies)');
      }

      console.log('[LoginModal] Preparing redirect...');

      // Check if user was trying to checkout before login
      const pendingCheckout = typeof window !== 'undefined'
        ? localStorage.getItem('pendingCheckout')
        : null;

      const redirectUrl = pendingCheckout ? '/pricing' : '/dashboard/generate';
      console.log('[LoginModal] Redirecting to:', redirectUrl);

      // Use window.location for reliable navigation after login
      // Don't reset isSubmitting since we're redirecting
      window.location.href = redirectUrl;
    } catch (error: any) {
      console.error('[LoginModal] Login error:', error);
      setIsSubmitting(false);

      // Provide user-friendly error messages based on error type
      if (error.message === 'TIMEOUT') {
        setSubmitError('Request timed out. Please check your internet connection and try again.');
      } else if (error.message === 'SESSION_ERROR') {
        setSubmitError('Failed to establish session. Please try again.');
      } else if (error.code === 'UNAUTHORIZED') {
        setSubmitError('Invalid email or password. Please try again.');
      } else if (error.message?.toLowerCase().includes('network')) {
        setSubmitError('Network error. Please check your connection and try again.');
      } else {
        setSubmitError(error.message || 'Login failed. Please try again.');
      }
    }
  };

  const onRegisterSubmit = async (data: RegisterInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('[LoginModal] Starting registration...');

      const result = await registerMutation.mutateAsync(data);

      console.log('[LoginModal] Registration successful, result:', result);

      if (!result.session) {
        console.error('[LoginModal] No session returned from registration');
        setSubmitError('Registration successful, but failed to log in automatically. Please log in manually.');
        setMode('login'); // Switch to login mode so user can log in
        return;
      }

      // Update Zustand store - this now persists to localStorage via middleware
      setAuth(result.user, result.session);
      console.log('[LoginModal] Auth state updated in Zustand store');

      // IMPORTANT: Set the session in Supabase client to store it in cookies
      // This allows the server to read the session from cookies for authentication
      // We do this AFTER setAuth to avoid the onAuthStateChange listener from re-fetching user data
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) {
        console.error('[LoginModal] Error setting session:', sessionError);
        throw new Error('SESSION_ERROR');
      }
      console.log('[LoginModal] Session set in Supabase client (cookies)');

      console.log('[LoginModal] Preparing redirect...');

      // Check if user was trying to checkout before registration
      const pendingCheckout = typeof window !== 'undefined'
        ? localStorage.getItem('pendingCheckout')
        : null;

      const redirectUrl = pendingCheckout ? '/pricing' : '/dashboard/generate';
      console.log('[LoginModal] Redirecting to:', redirectUrl);

      // Use window.location for reliable navigation after registration
      // Don't reset isSubmitting since we're redirecting
      window.location.href = redirectUrl;
    } catch (error: any) {
      console.error('[LoginModal] Registration error:', error);
      setIsSubmitting(false);

      // Provide user-friendly error messages based on error type
      if (error.message === 'SESSION_ERROR') {
        setSubmitError('Failed to establish session. Please try again.');
      } else if (error.message?.toLowerCase().includes('already registered')) {
        setSubmitError('This email is already registered. Please log in instead.');
      } else if (error.message?.toLowerCase().includes('invalid email')) {
        setSubmitError('Please enter a valid email address.');
      } else if (error.message?.toLowerCase().includes('password')) {
        setSubmitError('Password must be at least 8 characters long.');
      } else {
        setSubmitError(error.message || 'Registration failed. Please try again.');
      }
    }
  };

  const onSubmit = async (data: LoginInput | RegisterInput) => {
    if (mode === 'login') {
      await onLoginSubmit(data as LoginInput);
    } else {
      await onRegisterSubmit(data as RegisterInput);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <span className="text-green-600 dark:text-green-400 font-bold text-xl">FL</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {mode === 'login'
              ? 'Sign in to continue to FreelanceFlow'
              : 'Join FreelanceFlow and streamline your client communications'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  First Name
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Last Name
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName.message}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              {mode === 'register' ? 'Email Address' : 'Work email'}
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="alexsmith@content-mobbin.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                Industry (Optional)
              </label>
              <select
                {...register('industry')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
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
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder={mode === 'register' ? 'Minimum 8 characters' : '••••••••••'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
          </div>

          {submitError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
              : (mode === 'login' ? 'Continue with email' : 'Create account')}
          </button>

          {mode === 'login' && (
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setSubmitError(null);
              }}
              className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleSocialLogin('google')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-gray-700 dark:text-gray-200 font-medium">Continue with Google</span>
          </button>

          <button
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            <span className="text-gray-700 dark:text-gray-200 font-medium">Continue with SAML SSO</span>
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          By signing up to the FreelanceFlow platform you understand and agree with our{' '}
          <a href="#" className="text-green-600 dark:text-green-400 hover:underline">Customer Terms of Service</a>
          {' and '}
          <a href="#" className="text-green-600 dark:text-green-400 hover:underline">Privacy Policy</a>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Having trouble? Contact us at{' '}
          <a href="mailto:support@freelanceflow.io" className="text-green-600 dark:text-green-400 hover:underline">
            support@freelanceflow.io
          </a>
        </div>
      </div>
    </div>
  );
}