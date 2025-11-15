# Rate Limiting Migration Guide

## Problem Statement

The current rate limiting implementation uses in-memory storage, which works for single-server deployments but has critical limitations in serverless and distributed environments:

1. **Serverless Issue**: Each serverless function instance (e.g., Vercel, AWS Lambda) has its own memory. A user can bypass rate limits by triggering new instances.

2. **Horizontal Scaling**: If you scale to multiple servers, each server tracks rate limits independently.

3. **State Loss**: Serverless functions can be terminated at any time, losing all rate limit state.

## Recommended Solution: Upstash Redis

Upstash is a serverless Redis service that's perfect for Vercel deployments and provides built-in rate limiting.

### Why Upstash?

- ✅ Serverless-native (no connection pooling needed)
- ✅ REST API support (works in edge functions)
- ✅ Built-in rate limiting package (`@upstash/ratelimit`)
- ✅ Global replication available
- ✅ Pay per request pricing
- ✅ Free tier: 10,000 requests/day

---

## Migration Steps

### Step 1: Set Up Upstash Redis

1. **Create Upstash Account**
   - Visit https://console.upstash.com
   - Sign up or log in

2. **Create a Redis Database**
   - Click "Create Database"
   - Choose a region close to your Vercel deployment
   - Select "Global" if you need multi-region support
   - Note: Free tier is sufficient for development

3. **Get Credentials**
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`

### Step 2: Install Dependencies

```bash
npm install @upstash/redis @upstash/ratelimit
```

### Step 3: Update Environment Variables

Add to `.env.local` and production environment:

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

Update `.env.example`:

```env
# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Step 4: Create New Rate Limiter Service

Create `utils/rateLimiter-upstash.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiting configurations
export const rateLimiters = {
  // Login: 5 attempts per 15 minutes
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'ratelimit:login',
  }),

  // Registration: 3 attempts per hour
  register: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: 'ratelimit:register',
  }),

  // Password reset: 3 attempts per hour
  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: 'ratelimit:password-reset',
  }),

  // General API: 100 requests per hour
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
    analytics: true,
    prefix: 'ratelimit:general',
  }),

  // History API: 200 requests per hour
  history: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 h'),
    analytics: true,
    prefix: 'ratelimit:history',
  }),
};

// Helper function to check rate limit
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset,
  };
}
```

### Step 5: Update Rate Limit Middleware

Update `server/middleware/rateLimit.ts`:

```typescript
import { TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { rateLimiters, checkRateLimit } from '../../utils/rateLimiter-upstash';
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

type RateLimitType = 'LOGIN' | 'REGISTER' | 'PASSWORD_RESET' | 'GENERAL' | 'HISTORY';

/**
 * Rate limiting middleware factory for tRPC procedures
 */
export function createRateLimitMiddleware(endpointType: RateLimitType) {
  return async (opts: { ctx: Context; next: () => any }) => {
    const { ctx, next } = opts;

    if (!ctx.req) {
      // Skip rate limiting if no request context (e.g., in tests)
      return next();
    }

    const clientIP = getClientIP(ctx.req);
    const identifier = `${endpointType}:${clientIP}`;

    // Select the appropriate rate limiter
    let limiter;
    switch (endpointType) {
      case 'LOGIN':
        limiter = rateLimiters.login;
        break;
      case 'REGISTER':
        limiter = rateLimiters.register;
        break;
      case 'PASSWORD_RESET':
        limiter = rateLimiters.passwordReset;
        break;
      case 'GENERAL':
        limiter = rateLimiters.general;
        break;
      case 'HISTORY':
        limiter = rateLimiters.history;
        break;
      default:
        limiter = rateLimiters.general;
    }

    const { success, remaining, reset } = await checkRateLimit(limiter, identifier);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);

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
        remaining,
        resetTime: new Date(reset).toISOString(),
      });
    }

    return next();
  };
}
```

### Step 6: Test the Implementation

1. **Unit Test**
   ```typescript
   // Test rate limiting
   import { rateLimiters } from './utils/rateLimiter-upstash';

   async function testRateLimit() {
     const testIP = 'test-ip-' + Date.now();

     // Should succeed for first 5 attempts
     for (let i = 0; i < 5; i++) {
       const result = await rateLimiters.login.limit(testIP);
       console.log(`Attempt ${i + 1}:`, result.success); // Should be true
     }

     // Should fail on 6th attempt
     const result = await rateLimiters.login.limit(testIP);
     console.log('Attempt 6:', result.success); // Should be false
   }

   testRateLimit();
   ```

2. **Integration Test**
   - Attempt 6 login requests from the same IP
   - Verify the 6th request is blocked
   - Wait 15 minutes or manually clear Redis
   - Verify requests work again

### Step 7: Remove Old Rate Limiter

Once confirmed working:

1. Delete `utils/rateLimiter.ts` (old in-memory version)
2. Update any imports to use the new Upstash version
3. Remove the cleanup interval code

### Step 8: Deploy

1. **Set Environment Variables in Vercel**
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL
   vercel env add UPSTASH_REDIS_REST_TOKEN
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Monitor**
   - Check Upstash dashboard for request metrics
   - Monitor rate limit logs in your application
   - Check security events table for rate limit violations

---

## Alternative: Vercel KV

If you prefer to use Vercel's built-in KV (which is actually Upstash under the hood):

### Setup

1. **Enable Vercel KV**
   ```bash
   vercel kv create
   ```

2. **Install Dependencies**
   ```bash
   npm install @vercel/kv
   ```

3. **Update Code**
   ```typescript
   import { kv } from '@vercel/kv';
   import { Ratelimit } from '@upstash/ratelimit';

   const ratelimit = new Ratelimit({
     redis: kv,
     limiter: Ratelimit.slidingWindow(5, '15 m'),
   });
   ```

4. **Environment Variables** (auto-configured by Vercel)
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

---

## Cost Estimation

### Upstash Free Tier
- 10,000 commands/day
- Sufficient for:
  - ~400 logins/day
  - Small to medium applications

### Upstash Paid Tier
- $0.20 per 100K commands
- Example: 1 million requests/month = $2/month

### When to Upgrade
- You exceed free tier (monitor in Upstash dashboard)
- You need global replication
- You need higher throughput

---

## Monitoring & Analytics

Upstash provides built-in analytics:

1. **Dashboard Metrics**
   - Request count
   - Rate limit hits
   - Response times

2. **Application Monitoring**
   ```typescript
   // Log rate limit statistics
   import { rateLimiters } from './utils/rateLimiter-upstash';

   const stats = await rateLimiters.login.limit('user-ip');
   console.log({
     success: stats.success,
     limit: stats.limit,
     remaining: stats.remaining,
     resetTime: new Date(stats.reset),
   });
   ```

3. **Security Events**
   - Rate limit violations are logged to `security_events` table
   - Query with: `SELECT * FROM security_events WHERE event_type = 'RATE_LIMIT_EXCEEDED'`

---

## Rollback Plan

If you encounter issues:

1. **Quick Rollback**
   - Rename `utils/rateLimiter-upstash.ts` to `utils/rateLimiter-upstash.ts.backup`
   - Rename `utils/rateLimiter.ts.backup` back to `utils/rateLimiter.ts`
   - Redeploy

2. **Hybrid Approach**
   - Keep both implementations
   - Use feature flag to switch between them
   - Gradually migrate endpoints

---

## FAQ

**Q: Can I use a different Redis provider?**
A: Yes! Any Redis provider works, but Upstash is optimized for serverless. Alternatives:
- Redis Labs
- AWS ElastiCache (requires VPC for Lambda)
- Self-hosted Redis (not recommended for serverless)

**Q: What about edge functions?**
A: Upstash REST API works perfectly in edge functions. No TCP connections needed.

**Q: How do I test locally?**
A: Upstash works in development. Alternatively, use a local Redis instance for development and Upstash for production.

**Q: What if Upstash is down?**
A: Implement a fallback strategy:
```typescript
try {
  const result = await limiter.limit(identifier);
  if (!result.success) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
  }
} catch (error) {
  // Log error but allow request (fail open)
  console.error('Rate limiting error:', error);
  // Consider implementing a circuit breaker here
}
```

---

## Additional Resources

- [Upstash Documentation](https://docs.upstash.com/)
- [Upstash Rate Limiting](https://github.com/upstash/ratelimit)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Vercel Serverless Functions Limits](https://vercel.com/docs/concepts/limits/overview)

---

**Priority:** HIGH
**Effort:** 2-3 hours
**Impact:** Prevents bypassing of rate limits in production

**Next Steps:**
1. Create Upstash account
2. Install dependencies
3. Implement new rate limiter
4. Test thoroughly
5. Deploy to staging
6. Monitor for issues
7. Deploy to production
