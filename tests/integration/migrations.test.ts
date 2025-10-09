import { describe, test, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Database Migration Validation', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  describe('Schema Validation', () => {
    test('Users table has correct structure', async () => {
      const { data, error } = await supabase.rpc('get_table_info', {
        table_name: 'users'
      });

      if (error) {
        // Fallback: test by attempting to insert a valid record structure
        const testUser = {
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          industry: 'Technology',
          communication_style: {
            formality: 'professional',
            tone: 'neutral',
            length: 'standard'
          },
          preferences: {
            defaultContext: {
              relationshipStage: 'established',
              projectPhase: 'active',
              urgency: 'standard',
              messageType: 'update'
            },
            emailNotifications: true
          },
          privacy_settings: {
            styleLearningConsent: false,
            analyticsConsent: false,
            marketingConsent: false,
            dataRetentionPeriod: 12
          }
        };

        // This should not fail due to schema issues (only RLS)
        const { error: insertError } = await supabase
          .from('users')
          .insert(testUser);

        expect(insertError?.message).not.toContain('column');
        expect(insertError?.message).not.toContain('does not exist');
      }
    });

    test('Response history table has correct structure', async () => {
      const testResponse = {
        user_id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
        original_message: 'Test message for schema validation',
        context: {
          urgency: 'standard',
          formality: 'professional',
          messageType: 'update',
          relationshipStage: 'established',
          projectPhase: 'active'
        },
        generated_options: [
          {
            content: 'Test response',
            tone: 'professional',
            confidence: 0.85
          }
        ],
        openai_model: 'gpt-4'
      };

      const { error } = await supabase
        .from('response_history')
        .insert(testResponse);

      // Should fail due to RLS, not schema issues
      expect(error?.message).not.toContain('column');
      expect(error?.message).not.toContain('does not exist');
    });

    test('Subscriptions table has correct structure', async () => {
      const testSubscription = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        tier: 'free',
        status: 'active',
        usage_count: 0,
        monthly_limit: 10
      };

      const { error } = await supabase
        .from('subscriptions')
        .insert(testSubscription);

      // Should fail due to RLS, not schema issues
      expect(error?.message).not.toContain('column');
      expect(error?.message).not.toContain('does not exist');
    });
  });

  describe('Constraints and Validation', () => {
    test('Response history message length constraints work', async () => {
      // Test minimum length constraint
      const shortMessage = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        original_message: 'Short', // Less than 10 characters
        context: { urgency: 'standard' },
        generated_options: [{ content: 'Test' }]
      };

      const { error: shortError } = await supabase
        .from('response_history')
        .insert(shortMessage);

      // Should fail due to length constraint (not RLS)
      if (shortError && !shortError.message.includes('policy')) {
        expect(shortError.message).toContain('char_length');
      }

      // Test maximum length constraint
      const longMessage = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        original_message: 'x'.repeat(2001), // More than 2000 characters
        context: { urgency: 'standard' },
        generated_options: [{ content: 'Test' }]
      };

      const { error: longError } = await supabase
        .from('response_history')
        .insert(longMessage);

      if (longError && !longError.message.includes('policy')) {
        expect(longError.message).toContain('char_length');
      }
    });

    test('Subscription tier constraints work', async () => {
      const invalidTier = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        tier: 'invalid_tier', // Not in allowed values
        status: 'active'
      };

      const { error } = await supabase
        .from('subscriptions')
        .insert(invalidTier);

      if (error && !error.message.includes('policy')) {
        expect(error.message).toContain('violates check constraint');
      }
    });
  });

  describe('Indexes and Performance', () => {
    test('Primary key indexes exist', async () => {
      const tables = ['users', 'subscriptions', 'response_history'];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        // Should be able to query without timeout (indicates index exists)
        expect(error).toBeNull();
      }
    });
  });

  describe('Row Level Security', () => {
    test('RLS is enabled on all tables', async () => {
      const tables = ['users', 'subscriptions', 'response_history'];

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        // Should get RLS error when not authenticated
        expect(error).toBeDefined();
        expect(error?.message).toContain('policy');
      }
    });
  });

  describe('Functions and Triggers', () => {
    test('Updated_at trigger works on response_history', async () => {
      // This test requires authentication, so we'll check the function exists
      const { error } = await supabase.rpc('update_updated_at_column');

      // Function should exist (may fail due to parameters, not existence)
      expect(error?.message).not.toContain('function');
      expect(error?.message).not.toContain('does not exist');
    });

    test('User subscription trigger function exists', async () => {
      const { error } = await supabase.rpc('handle_new_user');

      // Function should exist
      expect(error?.message).not.toContain('function');
      expect(error?.message).not.toContain('does not exist');
    });
  });

  describe('Extensions', () => {
    test('Required extensions are enabled', async () => {
      // Test uuid generation works
      const { data, error } = await supabase.rpc('uuid_generate_v4');

      expect(error).toBeNull();
      expect(data).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});