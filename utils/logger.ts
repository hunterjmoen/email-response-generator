/**
 * Production-safe logging utility
 * Only logs in development mode to prevent information disclosure in production
 */

import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Development-only logging - silenced in production
 */
export const devLog = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
};

/**
 * Log an error to Sentry and optionally to console in development
 * Use this for errors that should be tracked in production
 */
export function logError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  // Always send to Sentry in production
  if (!isDev) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    // In development, also log to console
    console.error('[Error]', error, context);
  }
}

/**
 * Log an error message to Sentry without throwing
 * Use for non-critical errors that should be tracked
 */
export function logErrorMessage(
  message: string,
  context?: Record<string, unknown>
): void {
  if (!isDev) {
    Sentry.captureMessage(message, {
      level: 'error',
      extra: context,
    });
  } else {
    console.error('[Error]', message, context);
  }
}

/**
 * Log a warning to Sentry
 * Use for issues that aren't errors but should be monitored
 */
export function logWarning(
  message: string,
  context?: Record<string, unknown>
): void {
  if (!isDev) {
    Sentry.captureMessage(message, {
      level: 'warning',
      extra: context,
    });
  } else {
    console.warn('[Warning]', message, context);
  }
}

export default { devLog, logError, logErrorMessage, logWarning };
