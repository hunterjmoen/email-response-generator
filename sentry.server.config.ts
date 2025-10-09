import { init } from '@sentry/nextjs';
import { getServerConfig } from './utils/config';

let serverConfig: ReturnType<typeof getServerConfig>;

try {
  serverConfig = getServerConfig();
} catch (error) {
  console.warn('Sentry server config not initialized - missing environment variables');
  serverConfig = {} as any;
}

init({
  dsn: serverConfig.SENTRY_DSN,
  environment: serverConfig.NODE_ENV,

  // Performance monitoring
  tracesSampleRate: serverConfig.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Filter sensitive data
  beforeSend(event) {
    // Remove sensitive data from error reports
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
    }
    return event;
  },

  // Tag events with useful context
  initialScope: {
    tags: {
      component: 'server',
    },
  },
});