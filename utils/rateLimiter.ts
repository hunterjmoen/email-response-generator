/**
 * Simple in-memory rate limiter for authentication endpoints
 * In production, this should be replaced with Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request should be rate limited
   * @param key - Identifier for the request (e.g., IP address, user ID)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with isLimited boolean and remaining attempts
   */
  checkLimit(key: string, limit: number, windowMs: number): {
    isLimited: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const resetTime = now + windowMs;

    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window has reset
      this.store.set(key, { count: 1, resetTime });
      return {
        isLimited: false,
        remaining: limit - 1,
        resetTime,
      };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return {
        isLimited: true,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      isLimited: false,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.store.entries())) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current status for a key
   */
  getStatus(key: string): { count: number; resetTime: number } | null {
    const entry = this.store.get(key);
    return entry || null;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

// Rate limiting configurations for different auth endpoints
export const AUTH_RATE_LIMITS = {
  // Login attempts: 5 per 15 minutes per IP
  LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 },
  // Registration: 3 per hour per IP
  REGISTER: { limit: 3, windowMs: 60 * 60 * 1000 },
  // Password reset requests: 3 per hour per IP
  PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 },
  // General auth endpoints: 100 per hour per IP
  GENERAL: { limit: 100, windowMs: 60 * 60 * 1000 },
} as const;

export default rateLimiter;