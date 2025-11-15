// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface LockoutInfo {
  isLocked: boolean;
  lockoutUntil: string | null;
  failedAttempts: number;
  minutesRemaining: number;
}

export interface LoginAttemptParams {
  email: string;
  clientIP: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}

export class AccountLockoutService {
  // Configuration
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 30;
  private static readonly ATTEMPT_WINDOW_MINUTES = 15;

  /**
   * Check if an account is currently locked
   */
  static async isAccountLocked(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('is_account_locked', { p_email: email });

      if (error) {
        console.error('Error checking account lockout:', error);
        return false; // Fail open to avoid locking out users due to DB errors
      }

      return data || false;
    } catch (error) {
      console.error('Error checking account lockout:', error);
      return false;
    }
  }

  /**
   * Get detailed lockout information for an account
   */
  static async getLockoutInfo(email: string): Promise<LockoutInfo | null> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_lockout_info', { p_email: email })
        .single();

      if (error) {
        console.error('Error getting lockout info:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        isLocked: data.is_locked,
        lockoutUntil: data.lockout_until,
        failedAttempts: data.failed_attempts,
        minutesRemaining: data.minutes_remaining,
      };
    } catch (error) {
      console.error('Error getting lockout info:', error);
      return null;
    }
  }

  /**
   * Record a login attempt (success or failure)
   */
  static async recordLoginAttempt(params: LoginAttemptParams): Promise<void> {
    try {
      await supabaseAdmin.rpc('record_login_attempt', {
        p_email: params.email,
        p_ip: params.clientIP,
        p_user_agent: params.userAgent,
        p_success: params.success,
        p_failure_reason: params.failureReason || null,
      });

      // If login failed, check if we need to lock the account
      if (!params.success) {
        await this.checkAndLockAccount(params.email, params.clientIP);
      } else {
        // Successful login - clear any existing lockout
        await this.clearLockout(params.email);
      }
    } catch (error) {
      console.error('Error recording login attempt:', error);
    }
  }

  /**
   * Check recent failed attempts and lock account if threshold exceeded
   */
  private static async checkAndLockAccount(email: string, clientIP: string): Promise<void> {
    try {
      // Count failed attempts in the last ATTEMPT_WINDOW_MINUTES
      const { data: attempts, error } = await supabaseAdmin
        .from('login_attempts')
        .select('id')
        .eq('user_email', email)
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - this.ATTEMPT_WINDOW_MINUTES * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error counting failed attempts:', error);
        return;
      }

      const failedCount = attempts?.length || 0;

      // Lock account if threshold exceeded
      if (failedCount >= this.MAX_ATTEMPTS) {
        const lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);

        await supabaseAdmin
          .from('account_lockouts')
          .upsert({
            user_email: email,
            lockout_until: lockoutUntil.toISOString(),
            failed_attempts_count: failedCount,
            last_attempt_ip: clientIP,
            last_attempt_at: new Date().toISOString(),
          }, {
            onConflict: 'user_email',
          });

        console.warn(`[SECURITY] Account locked for ${email} due to ${failedCount} failed attempts. Locked until ${lockoutUntil.toISOString()}`);
      }
    } catch (error) {
      console.error('Error checking and locking account:', error);
    }
  }

  /**
   * Clear account lockout (e.g., after successful login)
   */
  private static async clearLockout(email: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('account_lockouts')
        .delete()
        .eq('user_email', email);
    } catch (error) {
      console.error('Error clearing lockout:', error);
    }
  }

  /**
   * Manually unlock an account (admin function)
   */
  static async unlockAccount(email: string): Promise<void> {
    await this.clearLockout(email);
    console.log(`[ADMIN] Account manually unlocked for ${email}`);
  }

  /**
   * Cleanup old login attempts (should be called periodically)
   */
  static async cleanupOldAttempts(): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('cleanup_old_login_attempts');

      if (error) {
        console.error('Error cleaning up old attempts:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error cleaning up old attempts:', error);
      return 0;
    }
  }
}
