/**
 * Security Event Logging Service
 * Tracks authentication events, security violations, and suspicious activities
 */

import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client for security logging (uses service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_REGISTRATION_SUCCESS'
  | 'AUTH_REGISTRATION_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_PASSWORD_RESET_REQUESTED'
  | 'AUTH_PASSWORD_RESET_COMPLETED'
  | 'AUTH_TOKEN_EXPIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'PASSWORD_POLICY_VIOLATION'
  | 'ACCOUNT_LOCKOUT'
  | 'SESSION_HIJACK_ATTEMPT';

export interface SecurityEvent {
  eventType: SecurityEventType;
  userId?: string;
  userEmail?: string;
  clientIP: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  endpoint?: string;
  success: boolean;
}

export interface SecurityLoggerConfig {
  enableConsoleLogging: boolean;
  enableDatabaseLogging: boolean;
  enableWebhookNotifications: boolean;
  webhookUrl?: string;
  logLevel: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityLogger {
  private config: SecurityLoggerConfig;
  private eventBuffer: SecurityEvent[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<SecurityLoggerConfig>) {
    this.config = {
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableDatabaseLogging: process.env.NODE_ENV === 'production',
      enableWebhookNotifications: false,
      logLevel: 'medium',
      ...config,
    };

    // Start buffer flush timer (flush every 30 seconds in production)
    if (this.config.enableDatabaseLogging) {
      this.bufferFlushInterval = setInterval(() => {
        this.flushEventBuffer();
      }, 30000);
    }
  }

  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Check if event severity meets minimum log level
    if (!this.shouldLogEvent(fullEvent.severity)) {
      return;
    }

    // Console logging (immediate)
    if (this.config.enableConsoleLogging) {
      this.logToConsole(fullEvent);
    }

    // Database logging (buffered)
    if (this.config.enableDatabaseLogging) {
      this.eventBuffer.push(fullEvent);

      // Flush immediately for critical events
      if (fullEvent.severity === 'critical') {
        this.flushEventBuffer();
      }
    }

    // Webhook notifications for high/critical events
    if (this.config.enableWebhookNotifications &&
        (fullEvent.severity === 'high' || fullEvent.severity === 'critical')) {
      this.sendWebhookNotification(fullEvent);
    }
  }

  /**
   * Authentication-specific logging methods
   */
  logLoginAttempt(params: {
    userEmail: string;
    clientIP: string;
    userAgent: string;
    success: boolean;
    userId?: string;
    sessionId?: string;
    failureReason?: string;
  }): void {
    this.logEvent({
      eventType: params.success ? 'AUTH_LOGIN_SUCCESS' : 'AUTH_LOGIN_FAILED',
      userId: params.userId,
      userEmail: params.userEmail,
      clientIP: params.clientIP,
      userAgent: params.userAgent,
      severity: params.success ? 'low' : 'medium',
      message: params.success
        ? `Successful login for user ${params.userEmail}`
        : `Failed login attempt for user ${params.userEmail}: ${params.failureReason || 'Invalid credentials'}`,
      metadata: {
        failureReason: params.failureReason,
      },
      sessionId: params.sessionId,
      endpoint: '/api/trpc/auth.login',
      success: params.success,
    });
  }

  logRegistrationAttempt(params: {
    userEmail: string;
    clientIP: string;
    userAgent: string;
    success: boolean;
    userId?: string;
    failureReason?: string;
  }): void {
    this.logEvent({
      eventType: params.success ? 'AUTH_REGISTRATION_SUCCESS' : 'AUTH_REGISTRATION_FAILED',
      userId: params.userId,
      userEmail: params.userEmail,
      clientIP: params.clientIP,
      userAgent: params.userAgent,
      severity: params.success ? 'low' : 'medium',
      message: params.success
        ? `Successful registration for user ${params.userEmail}`
        : `Failed registration attempt for user ${params.userEmail}: ${params.failureReason || 'Unknown error'}`,
      metadata: {
        failureReason: params.failureReason,
      },
      endpoint: '/api/trpc/auth.register',
      success: params.success,
    });
  }

  logPasswordReset(params: {
    userEmail: string;
    clientIP: string;
    userAgent: string;
    eventType: 'requested' | 'completed';
    userId?: string;
  }): void {
    this.logEvent({
      eventType: params.eventType === 'requested'
        ? 'AUTH_PASSWORD_RESET_REQUESTED'
        : 'AUTH_PASSWORD_RESET_COMPLETED',
      userId: params.userId,
      userEmail: params.userEmail,
      clientIP: params.clientIP,
      userAgent: params.userAgent,
      severity: 'medium',
      message: `Password reset ${params.eventType} for user ${params.userEmail}`,
      endpoint: params.eventType === 'requested'
        ? '/api/trpc/auth.requestPasswordReset'
        : '/api/trpc/auth.resetPassword',
      success: true,
    });
  }

  logRateLimitExceeded(params: {
    clientIP: string;
    userAgent: string;
    endpoint: string;
    userEmail?: string;
    userId?: string;
  }): void {
    this.logEvent({
      eventType: 'RATE_LIMIT_EXCEEDED',
      userId: params.userId,
      userEmail: params.userEmail,
      clientIP: params.clientIP,
      userAgent: params.userAgent,
      severity: 'high',
      message: `Rate limit exceeded for endpoint ${params.endpoint} from IP ${params.clientIP}`,
      endpoint: params.endpoint,
      success: false,
    });
  }

  logSuspiciousActivity(params: {
    clientIP: string;
    userAgent: string;
    userEmail?: string;
    userId?: string;
    activityType: string;
    details: string;
    endpoint?: string;
  }): void {
    this.logEvent({
      eventType: 'SUSPICIOUS_ACTIVITY',
      userId: params.userId,
      userEmail: params.userEmail,
      clientIP: params.clientIP,
      userAgent: params.userAgent,
      severity: 'high',
      message: `Suspicious activity detected: ${params.activityType} - ${params.details}`,
      metadata: {
        activityType: params.activityType,
        details: params.details,
      },
      endpoint: params.endpoint,
      success: false,
    });
  }

  /**
   * Check if event should be logged based on severity level
   */
  private shouldLogEvent(severity: SecurityEvent['severity']): boolean {
    const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    return severityLevels[severity] >= severityLevels[this.config.logLevel];
  }

  /**
   * Log event to console with appropriate formatting
   */
  private logToConsole(event: SecurityEvent): void {
    const logMethod = event.severity === 'critical' || event.severity === 'high'
      ? console.error
      : event.severity === 'medium'
        ? console.warn
        : console.log;

    logMethod(`[SECURITY] ${event.eventType}`, {
      severity: event.severity,
      message: event.message,
      clientIP: event.clientIP,
      userEmail: event.userEmail,
      timestamp: event.timestamp.toISOString(),
      ...(event.metadata && { metadata: event.metadata }),
    });
  }

  /**
   * Flush buffered events to database
   */
  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = this.eventBuffer.splice(0);

    try {
      // Transform events to database format
      const dbEvents = events.map(event => ({
        event_type: event.eventType,
        user_id: event.userId || null,
        user_email: event.userEmail || null,
        client_ip: event.clientIP,
        user_agent: event.userAgent || null,
        severity: event.severity,
        message: event.message,
        metadata: event.metadata || {},
        session_id: event.sessionId || null,
        endpoint: event.endpoint || null,
        success: event.success,
        created_at: event.timestamp.toISOString(),
      }));

      // Insert events into database
      const { error } = await supabaseAdmin
        .from('security_events')
        .insert(dbEvents);

      if (error) {
        // Log error but don't crash - security logging should not affect application
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to flush security events to database:', error);
        }
        // Re-add events to buffer for retry (up to a limit)
        if (this.eventBuffer.length < 1000) {
          this.eventBuffer.unshift(...events);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to flush security events to database:', error);
      }
      // Re-add events to buffer for retry (up to a limit)
      if (this.eventBuffer.length < 1000) {
        this.eventBuffer.unshift(...events);
      }
    }
  }

  /**
   * Send webhook notification for critical events
   */
  private async sendWebhookNotification(event: SecurityEvent): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: event.eventType,
          severity: event.severity,
          message: event.message,
          timestamp: event.timestamp.toISOString(),
          clientIP: event.clientIP,
          userEmail: event.userEmail,
          metadata: event.metadata,
        }),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send security webhook notification:', error);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = null;
    }

    // Flush any remaining events
    this.flushEventBuffer();
  }
}

// Singleton instance
const securityLogger = new SecurityLogger();

export default securityLogger;