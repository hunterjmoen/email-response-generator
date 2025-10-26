import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../styles/globals.css';
import { trpc } from '../utils/trpc';
import { useAuthStore } from '../stores/auth';
import { Analytics } from '@vercel/analytics/react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Toaster } from 'react-hot-toast';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

function App({ Component, pageProps }: AppProps) {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Initialize auth state when app starts
    initialize();
  }, [initialize]);

  return (
    <Elements stripe={stripePromise}>
      <Component {...pageProps} />
      <Analytics />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Elements>
  );
}

export default trpc.withTRPC(App);