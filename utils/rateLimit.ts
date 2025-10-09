import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './monitoring';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis for production with multiple instances)
const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware for API endpoints
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function rateLimit(config: RateLimitConfig) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next?: () => void | Promise<void>
  ): Promise<boolean> => {
    // Get client identifier (IP address or user ID)
    const identifier = getClientIdentifier(req);
    const key = `ratelimit:${identifier}:${req.url}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = store[key];

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      store[key] = entry;
    }

    // Increment request count
    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    // Check if rate limit exceeded
    if (entry.count > config.maxRequests) {
      logger.warn(`Rate limit exceeded for ${identifier} on ${req.url}`, {
        identifier,
        url: req.url,
        count: entry.count,
        limit: config.maxRequests,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });

      return false;
    }

    // Continue to next middleware or handler
    if (next) {
      await next();
    }

    return true;
  };
}

/**
 * Get client identifier from request
 * Priority: User ID > API Key > IP Address
 */
function getClientIdentifier(req: NextApiRequest): string {
  // Check for authenticated user (from session or JWT)
  const userId = (req as any).session?.user?.id || (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // Check for API key in headers
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  if (apiKey) {
    return `apikey:${apiKey.toString().substring(0, 16)}`;
  }

  // Fallback to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress;

  return `ip:${ip || 'unknown'}`;
}

/**
 * Preset rate limit configurations
 */
export const rateLimitPresets = {
  // Strict rate limit for AI/expensive endpoints (10 requests per minute)
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Standard rate limit for authenticated endpoints (100 requests per minute)
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Relaxed rate limit for public endpoints (300 requests per minute)
  relaxed: {
    windowMs: 60 * 1000,
    maxRequests: 300,
  },
};

/**
 * Helper function to wrap API handlers with rate limiting
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const limiter = rateLimit(config);
    const allowed = await limiter(req, res);

    if (allowed) {
      return handler(req, res);
    }
  };
}
