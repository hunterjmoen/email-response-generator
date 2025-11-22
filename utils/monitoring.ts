/**
 * Monitoring and logging utilities for FreelanceFlow
 * Provides structured logging and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Structured log entry
interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp?: string;
  userId?: string;
  requestId?: string;
}

/**
 * Structured logger that integrates with Vercel Functions Logs and Sentry
 */
export class Logger {
  private static instance: Logger;
  private requestId: string | null = null;
  private userId: string | null = null;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setRequestContext(requestId: string, userId?: string) {
    this.requestId = requestId;
    this.userId = userId ?? null;
  }

  private formatLog(entry: LogEntry): string {
    const logData = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      requestId: this.requestId,
      userId: this.userId,
    };

    return JSON.stringify(logData);
  }

  debug(message: string, context?: Record<string, any>) {
    const entry: LogEntry = { level: 'debug', message, context };
    console.log(this.formatLog(entry));
  }

  info(message: string, context?: Record<string, any>) {
    const entry: LogEntry = { level: 'info', message, context };
    console.log(this.formatLog(entry));
  }

  warn(message: string, context?: Record<string, any>) {
    const entry: LogEntry = { level: 'warn', message, context };
    console.warn(this.formatLog(entry));

    // Send warnings to Sentry with lower severity
    Sentry.addBreadcrumb({
      message,
      level: 'warning',
      data: context,
    });
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    const entry: LogEntry = {
      level: 'error',
      message,
      context: {
        ...context,
        error: error?.message,
        stack: error?.stack,
      }
    };

    console.error(this.formatLog(entry));

    // Send errors to Sentry
    if (error) {
      Sentry.captureException(error, {
        contexts: {
          custom: context,
        },
        tags: {
          source: 'application',
        },
      });
    } else {
      Sentry.captureMessage(message, 'error');
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      Logger.getInstance().warn(`Timer '${label}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);

    Logger.getInstance().info(`Performance: ${label}`, { duration });

    // Send performance metrics to Sentry
    Sentry.addBreadcrumb({
      message: `Performance: ${label}`,
      level: 'info',
      data: { duration },
    });

    return duration;
  }

  static measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startTimer(label);
      try {
        const result = await fn();
        this.endTimer(label);
        resolve(result);
      } catch (error) {
        this.endTimer(label);
        Logger.getInstance().error(`Error in ${label}`, error as Error);
        reject(error);
      }
    });
  }
}

/**
 * Application health monitoring
 */
export class HealthMonitor {
  static async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    timestamp: string;
  }> {
    const checks: Record<string, boolean> = {};
    const logger = Logger.getInstance();

    // Check environment variables
    try {
      const { getServerConfig } = await import('./config');
      getServerConfig();
      checks.environment = true;
    } catch (error) {
      checks.environment = false;
      logger.warn('Environment check failed', { error: (error as Error).message });
    }

    // Check Supabase connectivity (if in server environment)
    if (typeof window === 'undefined') {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const { getServerConfig } = await import('./config');
        const config = getServerConfig();

        const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
        const { error } = await supabase.from('users').select('count').limit(1);
        checks.database = !error;
      } catch (error) {
        checks.database = false;
        logger.warn('Database check failed', { error: (error as Error).message });
      }
    }

    // Determine overall status
    const allPassing = Object.values(checks).every(check => check);
    const somePassing = Object.values(checks).some(check => check);

    const status = allPassing ? 'healthy' : somePassing ? 'degraded' : 'unhealthy';

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Error boundary utility for React components
 */
export function captureComponentError(error: Error, errorInfo: any) {
  Logger.getInstance().error('React component error', error, {
    componentStack: errorInfo.componentStack,
  });
}

// Export singleton logger instance
export const logger = Logger.getInstance();