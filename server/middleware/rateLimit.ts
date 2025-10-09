import { TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import rateLimiter, { AUTH_RATE_LIMITS } from '../../utils/rateLimiter';
import securityLogger from '../../services/securityLogger';
import type { Context } from '../trpc';

/**
 * Get client IP address from Next.js request
 */
function getClientIP(req: CreateNextContextOptions['req']): string {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];

  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  if (typeof realIP === 'string') {
    return realIP;
  }

  return req.socket.remoteAddress || 'unknown';
}

/**
 * Rate limiting middleware factory for tRPC procedures
 */
export function createRateLimitMiddleware(
  endpointType: keyof typeof AUTH_RATE_LIMITS
) {
  const config = AUTH_RATE_LIMITS[endpointType];

  return (opts: { ctx: Context; next: () => any }) => {
    const { ctx, next } = opts;

    if (!ctx.req) {
      // Skip rate limiting if no request context (e.g., in tests)
      return next();
    }

    const clientIP = getClientIP(ctx.req);
    const key = `${endpointType}:${clientIP}`;

    const result = rateLimiter.checkLimit(key, config.limit, config.windowMs);

    if (result.isLimited) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

      // Log security event for rate limiting
      securityLogger.logRateLimitExceeded({
        clientIP,
        userAgent: ctx.req?.headers['user-agent'] || 'unknown',
        endpoint: endpointType,
        userEmail: ctx.user?.email || undefined,
        userId: ctx.user?.id || undefined,
      });

      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Too many ${endpointType.toLowerCase()} attempts. Please try again in ${retryAfter} seconds.`,
      });
    }

    // Log successful request for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log(`Rate limit check passed for ${endpointType} from IP ${clientIP}`, {
        remaining: result.remaining,
        resetTime: new Date(result.resetTime).toISOString(),
      });
    }

    return next();
  };
}

/**
 * Enhanced context creator that includes request object for rate limiting
 */
export function enhanceContextWithRateLimit(
  originalCreateContext: (opts: CreateNextContextOptions) => Promise<any>
) {
  return async (opts: CreateNextContextOptions) => {
    const baseContext = await originalCreateContext(opts);

    return {
      ...baseContext,
      req: opts.req, // Add request object for rate limiting
    };
  };
}

/**
 * Utility to manually reset rate limit for a specific IP and endpoint
 * Useful for testing or emergency situations
 */
export function resetRateLimit(clientIP: string, endpointType: keyof typeof AUTH_RATE_LIMITS): void {
  const key = `${endpointType}:${clientIP}`;
  rateLimiter.reset(key);

  console.info(`Rate limit reset for ${endpointType} from IP ${clientIP}`, {
    endpoint: endpointType,
    clientIP,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(
  clientIP: string,
  endpointType: keyof typeof AUTH_RATE_LIMITS
): { count: number; resetTime: number; remaining: number } | null {
  const key = `${endpointType}:${clientIP}`;
  const status = rateLimiter.getStatus(key);

  if (!status) {
    return null;
  }

  const config = AUTH_RATE_LIMITS[endpointType];
  return {
    ...status,
    remaining: Math.max(0, config.limit - status.count),
  };
}