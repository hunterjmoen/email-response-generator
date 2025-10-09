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
        const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
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
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            email: input.email,
            first_name: input.firstName,
            last_name: input.lastName,
            industry: input.industry,
          })
          .select()
          .single();

        if (userError) {
          console.error('Error creating user profile:', userError);

          securityLogger.logRegistrationAttempt({
            userEmail: input.email,
            clientIP,
            userAgent,
            success: false,
            userId: authData.user.id,
            failureReason: 'Failed to create user profile',
          });

          // Note: Auth user is already created, so we should handle this gracefully
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user profile',
          });
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

        return {
          user,
          session: authData.session,
          message: 'Registration successful. Please check your email to verify your account.',
        };
      } catch (error) {
        console.error('Registration error:', error);

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

        // Fetch user profile data
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('*, subscriptions(*)')
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

        const user: User = {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          industry: userData.industry,
          communicationStyle: userData.communication_style,
          subscription: {
            tier: userData.subscriptions?.tier || 'free',
            status: userData.subscriptions?.status || 'active',
            usageCount: userData.subscriptions?.usage_count || 0,
            billingCycle: userData.subscriptions?.usage_reset_date || undefined,
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
        console.error('Login error:', error);
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
        console.error('Logout error:', error);
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
        console.error('Password reset request error:', error);
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
        console.error('Password reset error:', error);
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