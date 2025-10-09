import { init } from '@sentry/nextjs';

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Edge runtime specific configuration
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Tag events for edge runtime
  initialScope: {
    tags: {
      component: 'edge',
    },
  },
});