import { z } from 'zod';
import {
  router,
  publicProcedure,
  protectedProcedure,
  loginProcedure,
  registerProcedure,
  passwordResetProcedure,
  generalAuthProcedure
} from '../trpc';
import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import securityLogger from '../../services/securityLogger';
import {
  RegisterSchema,
  LoginSchema,
  PasswordResetRequestSchema,
  PasswordResetSchema,
  type User
} from '@freelance-flow/shared';
import { devLog, logError } from '../../utils/logger';

// Create server-side Supabase client with service role
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

export const authRouter = router({
  register: registerProcedure
    .input(RegisterSchema)
    .mutation(async ({ input, ctx }) => {
      const clientIP = ctx.req?.socket?.remoteAddress || 'unknown';
      const userAgent = ctx.req?.headers['user-agent'] || 'unknown';
      try {
        // Create user with Supabase Auth
        // Using admin API to auto-confirm the email for better UX
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            first_name: input.firstName,
            last_name: input.lastName,
          },
        });

        if (authError) {
          securityLogger.logRegistrationAttempt({
            userEmail: input.email,
            clientIP,
            userAgent,
            success: false,
            failureReason: authError.message,
          });

          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: authError.message,
          });
        }

        if (!authData.user) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user',
          });
        }

        // Store additional user profile data
        // Use upsert to handle cases where auth user exists but profile doesn't
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: authData.user.id,
            email: input.email,
            first_name: input.firstName,
            last_name: input.lastName,
            industry: input.industry,
            // Provide defaults explicitly in case database defaults aren't set up
            communication_style: {
              formality: 'professional',
              tone: 'neutral',
              length: 'standard',
            },
            preferences: {
              defaultContext: {
                relationshipStage: 'established',
                projectPhase: 'active',
                urgency: 'standard',
                messageType: 'update',
              },
              emailNotifications: true,
            },
            privacy_settings: {
              styleLearningConsent: false,
              analyticsConsent: false,
              marketingConsent: false,
              dataRetentionPeriod: 12,
            },
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (userError) {
          logError(userError, { context: 'Create user profile' });

          securityLogger.logRegistrationAttempt({
            userEmail: input.email,
            clientIP,
            userAgent,
            success: false,
            userId: authData.user.id,
            failureReason: `Failed to create user profile: ${userError.message}`,
          });

          // Note: Auth user is already created, so we should handle this gracefully
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user profile',
          });
        }

        // Create initial free subscription for the new user
        // Use upsert to handle cases where subscription already exists
        const { error: subscriptionError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: authData.user.id,
            tier: 'free',
            status: 'active',
            monthly_limit: 10,
            usage_count: 0,
            has_used_trial: false,
            cancel_at_period_end: false,
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });

        if (subscriptionError) {
          logError(subscriptionError, { context: 'Create subscription' });
          // Don't fail registration if subscription creation fails, just log it
        }

        const user: User = {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          industry: userData.industry,
          communicationStyle: userData.communication_style,
          subscription: {
            tier: 'free',
            status: 'active',
            usageCount: 0,
            monthlyLimit: 10,
            has_used_trial: false,
          },
          preferences: userData.preferences,
          createdAt: userData.created_at,
          updatedAt: userData.updated_at,
        };

        // Log successful registration
        securityLogger.logRegistrationAttempt({
          userEmail: input.email,
          clientIP,
          userAgent,
          success: true,
          userId: user.id,
        });

        // Now sign in the user to get a session since admin.createUser doesn't return one
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });

        if (signInError || !signInData.session) {
          devLog.error('Error signing in after registration:', signInError);
          // Still return success but without session - user can login manually
          return {
            user,
            session: null,
            message: 'Registration successful. Please log in to continue.',
          };
        }

        return {
          user,
          session: signInData.session,
          message: 'Registration successful!',
        };
      } catch (error) {
        logError(error, { context: 'Registration' });

        if (!(error instanceof TRPCError)) {
          securityLogger.logRegistrationAttempt({
            userEmail: input.email,
            clientIP,
            userAgent,
            success: false,
            failureReason: 'Unexpected error during registration',
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during registration',
        });
      }
    }),

  login: loginProcedure
    .input(LoginSchema)
    .mutation(async ({ input, ctx }) => {
      const clientIP = ctx.req?.socket?.remoteAddress || 'unknown';
      const userAgent = ctx.req?.headers['user-agent'] || 'unknown';
      try {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });

        if (error) {
          securityLogger.logLoginAttempt({
            userEmail: input.email,
            clientIP,
            userAgent,
            success: false,
            failureReason: error.message,
          });

          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        if (!data.user || !data.session) {
          securityLogger.logLoginAttempt({
            userEmail: input.email,
            clientIP,
            userAgent,
            success: false,
            failureReason: 'No user or session returned',
          });

          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Login failed',
          });
        }

        // Fetch user profile data - optimized to fetch separately to avoid slow JOIN
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          securityLogger.logLoginAttempt({
            userEmail: input.email,
            clientIP,
            userAgent,
            success: false,
            userId: data.user.id,
            failureReason: 'Failed to fetch user profile',
          });

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch user profile',
          });
        }

        // Fetch subscription separately for better performance
        const { data: subscriptionData } = await supabaseAdmin
          .from('subscriptions')
          .select('tier, status, usage_count, monthly_limit, usage_reset_date, billing_interval, has_used_trial')
          .eq('user_id', data.user.id)
          .single();

        const user: User = {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          industry: userData.industry,
          communicationStyle: userData.communication_style,
          subscription: {
            tier: subscriptionData?.tier || 'free',
            status: subscriptionData?.status || 'active',
            usageCount: subscriptionData?.usage_count || 0,
            monthlyLimit: subscriptionData?.monthly_limit || 10,
            billingCycle: subscriptionData?.usage_reset_date || undefined,
            billing_interval: (subscriptionData as any)?.billing_interval as 'monthly' | 'annual' | undefined,
            has_used_trial: (subscriptionData as any)?.has_used_trial || false,
          },
          preferences: userData.preferences,
          createdAt: userData.created_at,
          updatedAt: userData.updated_at,
        };

        // Log successful login
        securityLogger.logLoginAttempt({
          userEmail: input.email,
          clientIP,
          userAgent,
          success: true,
          userId: user.id,
          sessionId: data.session.access_token,
        });

        return {
          user,
          session: data.session,
        };
      } catch (error) {
        logError(error, { context: 'Login' });
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during login',
        });
      }
    }),

  logout: protectedProcedure
    .mutation(async () => {
      try {
        const { error } = await supabaseAdmin.auth.signOut();
        
        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to logout',
          });
        }

        return { message: 'Logout successful' };
      } catch (error) {
        logError(error, { context: 'Logout' });
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during logout',
        });
      }
    }),

  requestPasswordReset: passwordResetProcedure
    .input(PasswordResetRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const clientIP = ctx.req?.socket?.remoteAddress || 'unknown';
      const userAgent = ctx.req?.headers['user-agent'] || 'unknown';
      try {
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(input.email, {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
        });

        if (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }

        // Log password reset request (success)
        securityLogger.logPasswordReset({
          userEmail: input.email,
          clientIP,
          userAgent,
          eventType: 'requested',
        });

        return {
          message: 'If an account with that email exists, we have sent a password reset link.',
        };
      } catch (error) {
        logError(error, { context: 'Password reset request' });
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  resetPassword: passwordResetProcedure
    .input(PasswordResetSchema)
    .mutation(async ({ input, ctx }) => {
      const clientIP = ctx.req?.socket?.remoteAddress || 'unknown';
      const userAgent = ctx.req?.headers['user-agent'] || 'unknown';
      try {
        const { data, error } = await supabaseAdmin.auth.updateUser({
          password: input.password
        });

        if (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }

        // Invalidate all other sessions for security
        // This ensures any compromised sessions are terminated after password change
        if (data.user?.id) {
          await supabaseAdmin.auth.admin.signOut(data.user.id, 'others');
        }

        // Log password reset completion
        securityLogger.logPasswordReset({
          userEmail: data.user?.email || 'unknown',
          clientIP,
          userAgent,
          eventType: 'completed',
          userId: data.user?.id,
        });

        return {
          message: 'Password updated successfully',
        };
      } catch (error) {
        logError(error, { context: 'Password reset' });
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.user;
    }),
});