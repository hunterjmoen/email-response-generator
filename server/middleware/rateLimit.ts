import { TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import rateLimiter, { AUTH_RATE_LIMITS } from '../../utils/rateLimiter';
import securityLogger from '../../services/securityLogger';
import type { Context } from '../trpc';

/**
 * Validate if a string is a valid IP address
 */
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Get client IP address from Next.js request
 * Only trusts proxy headers when running on Vercel (VERCEL env var is set)
 * Validates IP format to prevent header spoofing attacks
 */
function getClientIP(req: CreateNextContextOptions['req']): string {
  // Only trust proxy headers on Vercel
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

  if (isVercel) {
    // On Vercel, x-forwarded-for and x-real-ip can be trusted
    const forwarded = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];

    if (typeof forwarded === 'string') {
      const ip = forwarded.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }

    if (typeof realIP === 'string' && isValidIP(realIP)) {
      return realIP;
    }
  }

  // Fall back to socket address (not behind proxy or validation failed)
  const socketIP = req.socket.remoteAddress;
  if (socketIP && isValidIP(socketIP)) {
    return socketIP;
  }

  return 'unknown';
}

/**
 * Rate limiting middleware factory for tRPC procedures
 */
export function createRateLimitMiddleware(
  endpointType: keyof typeof AUTH_RATE_LIMITS
) {
  const config = AUTH_RATE_LIMITS[endpointType];

  return async (opts: { ctx: Context; next: () => any }) => {
    const { ctx, next } = opts;

    if (!ctx.req) {
      // Skip rate limiting if no request context (e.g., in tests)
      return next();
    }

    const clientIP = getClientIP(ctx.req);
    const key = `${endpointType}:${clientIP}`;

    const result = await rateLimiter.checkLimit(key, config.limit, config.windowMs);

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
export async function resetRateLimit(clientIP: string, endpointType: keyof typeof AUTH_RATE_LIMITS): Promise<void> {
  const key = `${endpointType}:${clientIP}`;
  await rateLimiter.reset(key);

  console.info(`Rate limit reset for ${endpointType} from IP ${clientIP}`, {
    endpoint: endpointType,
    clientIP,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get current rate limit status for debugging
 */
export async function getRateLimitStatus(
  clientIP: string,
  endpointType: keyof typeof AUTH_RATE_LIMITS
): Promise<{ count: number; resetTime: number; remaining: number } | null> {
  const key = `${endpointType}:${clientIP}`;
  const status = await rateLimiter.getStatus(key);

  if (!status) {
    return null;
  }

  const config = AUTH_RATE_LIMITS[endpointType];
  return {
    ...status,
    remaining: Math.max(0, config.limit - status.count),
  };
}