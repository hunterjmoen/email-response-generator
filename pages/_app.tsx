import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../styles/globals.css';
import { trpc } from '../utils/trpc';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';
import { Analytics } from '@vercel/analytics/react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '../components/ThemeProvider';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

function App({ Component, pageProps }: AppProps) {
  const { initialize } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    // Initialize auth state when app starts
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider>
      <Elements stripe={stripePromise}>
        <Component {...pageProps} />
        <Analytics />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: theme === 'dark' ? '#1f2937' : '#fff',
              color: theme === 'dark' ? '#f3f4f6' : '#363636',
              border: theme === 'dark' ? '1px solid #374151' : 'none',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: theme === 'dark' ? '#1f2937' : '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: theme === 'dark' ? '#1f2937' : '#fff',
              },
            },
          }}
        />
      </Elements>
    </ThemeProvider>
  );
}

export default trpc.withTRPC(App);