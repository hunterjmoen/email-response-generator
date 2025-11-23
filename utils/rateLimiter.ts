/**
 * Database-backed rate limiter for authentication endpoints
 * Uses Supabase for persistence across server instances and restarts
 */

import { createClient } from '@supabase/supabase-js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Create Supabase client for rate limiting (uses service role for write access)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

class RateLimiter {
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30 * 60 * 1000);
  }

  /**
   * Check if a request should be rate limited
   * @param key - Identifier for the request (e.g., IP address, user ID)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with isLimited boolean and remaining attempts
   */
  async checkLimit(key: string, limit: number, windowMs: number): Promise<{
    isLimited: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = new Date();
    const resetTime = new Date(Date.now() + windowMs);

    try {
      // Try to get existing entry
      const { data: entry, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('key', key)
        .single();

      // If entry doesn't exist or has expired, create new one
      if (error || !entry || new Date(entry.reset_time) < now) {
        const { error: upsertError } = await supabase
          .from('rate_limits')
          .upsert({
            key,
            count: 1,
            reset_time: resetTime.toISOString(),
            updated_at: now.toISOString(),
          }, {
            onConflict: 'key',
          });

        if (upsertError) {
          console.error('Rate limit upsert error:', upsertError);
          // Fail open - allow request if database error
          return {
            isLimited: false,
            remaining: limit - 1,
            resetTime: resetTime.getTime(),
          };
        }

        return {
          isLimited: false,
          remaining: limit - 1,
          resetTime: resetTime.getTime(),
        };
      }

      // Check if limit exceeded
      if (entry.count >= limit) {
        return {
          isLimited: true,
          remaining: 0,
          resetTime: new Date(entry.reset_time).getTime(),
        };
      }

      // Increment count
      const { error: updateError } = await supabase
        .from('rate_limits')
        .update({
          count: entry.count + 1,
          updated_at: now.toISOString(),
        })
        .eq('key', key);

      if (updateError) {
        console.error('Rate limit update error:', updateError);
        // Fail open - allow request if database error
        return {
          isLimited: false,
          remaining: limit - entry.count - 1,
          resetTime: new Date(entry.reset_time).getTime(),
        };
      }

      return {
        isLimited: false,
        remaining: limit - entry.count - 1,
        resetTime: new Date(entry.reset_time).getTime(),
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if unexpected error
      return {
        isLimited: false,
        remaining: limit - 1,
        resetTime: resetTime.getTime(),
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<void> {
    await supabase
      .from('rate_limits')
      .delete()
      .eq('key', key);
  }

  /**
   * Clean up expired entries
   */
  private async cleanup(): Promise<void> {
    const now = new Date();
    await supabase
      .from('rate_limits')
      .delete()
      .lt('reset_time', now.toISOString());
  }

  /**
   * Get current status for a key
   */
  async getStatus(key: string): Promise<{ count: number; resetTime: number } | null> {
    const { data: entry } = await supabase
      .from('rate_limits')
      .select('count, reset_time')
      .eq('key', key)
      .single();

    if (!entry) return null;

    return {
      count: entry.count,
      resetTime: new Date(entry.reset_time).getTime(),
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
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
  // History endpoints: 200 per hour per IP
  HISTORY: { limit: 200, windowMs: 60 * 60 * 1000 },
} as const;

export default rateLimiter;