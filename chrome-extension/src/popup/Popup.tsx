import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MESSAGE_TYPES } from '../shared/constants';
import type { AuthState, ExtensionMessage, LoginPayload } from '../shared/types';
import './popup.css';

function Popup() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    loading: true,
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.GET_AUTH_STATE } as ExtensionMessage,
      (response: AuthState) => {
        if (response) {
          setAuthState({ ...response, loading: false });
        } else {
          setAuthState((prev) => ({ ...prev, loading: false }));
        }
      }
    );

    // Listen for auth state changes
    const listener = (message: ExtensionMessage<AuthState>) => {
      if (message.type === MESSAGE_TYPES.AUTH_STATE_CHANGED && message.payload) {
        setAuthState({ ...message.payload, loading: false });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.LOGIN,
        payload: { email, password } as LoginPayload,
      } as ExtensionMessage<LoginPayload>);

      if (!response.success) {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      setError('Failed to connect to FreelanceFlow');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.LOGOUT,
    } as ExtensionMessage);
  };

  if (authState.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (authState.isAuthenticated && authState.user) {
    return (
      <div className="p-4 bg-gray-50 min-h-[400px]">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            <span className="text-emerald-600">Freelance</span>
            <span className="text-gray-600">Flow</span>
          </h1>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-4">
          <p className="text-sm text-gray-500 mb-1">Signed in as</p>
          <p className="font-medium text-gray-900">{authState.user.email}</p>
          {authState.user.first_name && (
            <p className="text-sm text-gray-600">
              {authState.user.first_name} {authState.user.last_name}
            </p>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-800">
            Open Gmail to use FreelanceFlow. The sidebar will appear when you view emails.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="btn-secondary w-full"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-[400px]">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-white text-xl font-bold">F</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">
          <span className="text-emerald-600">Freelance</span>
          <span className="text-gray-600">Flow</span>
        </h1>
        <p className="text-sm text-gray-500">Sign in to continue</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoggingIn}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-xs text-gray-500 text-center mt-4">
        Don't have an account?{' '}
        <a
          href="https://freelanceflow.app/auth/register"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          Sign up
        </a>
      </p>
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
