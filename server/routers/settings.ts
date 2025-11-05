import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';

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

// Validation schemas
const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  industry: z.string().optional(),
});

const UpdateCommunicationStyleSchema = z.object({
  formality: z.enum(['casual', 'professional', 'formal']),
  tone: z.enum(['friendly', 'neutral', 'firm']),
  length: z.enum(['concise', 'standard', 'detailed']),
});

const UpdateDefaultContextSchema = z.object({
  relationshipStage: z.enum(['new', 'established', 'long-term']),
  projectPhase: z.enum(['discovery', 'active', 'completion', 'maintenance']),
  urgency: z.enum(['low', 'standard', 'high', 'urgent']),
  messageType: z.enum(['update', 'question', 'request', 'issue', 'general']),
});

const UpdatePrivacySettingsSchema = z.object({
  styleLearningConsent: z.boolean(),
  analyticsConsent: z.boolean(),
  marketingConsent: z.boolean(),
  dataRetentionPeriod: z.number().int().positive(),
});

const UpdateNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
});

export const settingsRouter = router({
  // Get current user settings
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', ctx.user.id)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      return {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        industry: data.industry,
        communicationStyle: data.communication_style,
        preferences: data.preferences,
        privacySettings: data.privacy_settings,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }),

  // Update profile information
  updateProfile: protectedProcedure
    .input(UpdateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          first_name: input.firstName,
          last_name: input.lastName,
          industry: input.industry || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }

      return {
        success: true,
        data: {
          firstName: data.first_name,
          lastName: data.last_name,
          industry: data.industry,
        },
      };
    }),

  // Update communication style preferences
  updateCommunicationStyle: protectedProcedure
    .input(UpdateCommunicationStyleSchema)
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          communication_style: input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update communication style',
        });
      }

      return {
        success: true,
        data: data.communication_style,
      };
    }),

  // Update default context preferences
  updateDefaultContext: protectedProcedure
    .input(UpdateDefaultContextSchema)
    .mutation(async ({ input, ctx }) => {
      // Get current preferences
      const { data: userData, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('preferences')
        .eq('id', ctx.user.id)
        .single();

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch current preferences',
        });
      }

      const updatedPreferences = {
        ...userData.preferences,
        defaultContext: input,
      };

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          preferences: updatedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update default context',
        });
      }

      return {
        success: true,
        data: data.preferences,
      };
    }),

  // Update privacy settings
  updatePrivacySettings: protectedProcedure
    .input(UpdatePrivacySettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          privacy_settings: input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update privacy settings',
        });
      }

      return {
        success: true,
        data: data.privacy_settings,
      };
    }),

  // Update notification preferences
  updateNotificationPreferences: protectedProcedure
    .input(UpdateNotificationPreferencesSchema)
    .mutation(async ({ input, ctx }) => {
      // Get current preferences
      const { data: userData, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('preferences')
        .eq('id', ctx.user.id)
        .single();

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch current preferences',
        });
      }

      const updatedPreferences = {
        ...userData.preferences,
        emailNotifications: input.emailNotifications,
      };

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          preferences: updatedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update notification preferences',
        });
      }

      return {
        success: true,
        data: data.preferences,
      };
    }),

  // Upload avatar (placeholder for now, will need Supabase Storage setup)
  uploadAvatar: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement Supabase Storage upload
      // For now, return a placeholder response
      console.log('Avatar upload requested:', input);

      return {
        success: true,
        message: 'Avatar upload endpoint ready (storage integration pending)',
      };
    }),

  // Export user data (GDPR compliance)
  exportUserData: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Fetch all user data
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', ctx.user.id)
        .single();

      const { data: subscriptionData, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', ctx.user.id)
        .single();

      if (userError || !userData) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export user data',
        });
      }

      return {
        success: true,
        data: {
          user: userData,
          subscription: subscriptionData,
          exportedAt: new Date().toISOString(),
        },
      };
    }),
});
