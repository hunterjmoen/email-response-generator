import { init } from '@sentry/nextjs';
import { getClientConfig } from './utils/config';

const clientConfig = getClientConfig();

init({
  dsn: clientConfig.SENTRY_PUBLIC_DSN,
  environment: clientConfig.NODE_ENV,

  // Capture performance data
  tracesSampleRate: clientConfig.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out irrelevant errors
  beforeSend(event) {
    // Filter out development mode errors
    if (clientConfig.NODE_ENV === 'development' && event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type === 'ChunkLoadError' || error?.type === 'Error') {
        return null;
      }
    }
    return event;
  },

  // Tag events with useful context
  initialScope: {
    tags: {
      component: 'client',
    },
  },
});