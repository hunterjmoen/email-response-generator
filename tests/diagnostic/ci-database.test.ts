import { createClient } from '@supabase/supabase-js';
import { describe, test, expect } from '@jest/globals';

describe('CI Database Diagnostic', () => {
  test('Print Supabase connection info and database state', async () => {
    // Print environment variables (masked for security)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('\n=== CI DATABASE DIAGNOSTIC ===');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Project ID:', supabaseUrl.split('//')[1]?.split('.')[0] || 'UNKNOWN');
    console.log('Has Anon Key:', hasAnonKey);
    console.log('Has Service Role Key:', hasServiceKey);
    console.log('================================\n');

    if (!supabaseUrl || supabaseUrl === 'NOT SET') {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set!');
      expect(supabaseUrl).not.toBe('NOT SET');
      return;
    }

    if (!hasServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set!');
      expect(hasServiceKey).toBe(true);
      return;
    }

    // Create client with service role key
    const supabase = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('\n=== CHECKING DATABASE STATE ===');

    // Check if we can connect at all
    try {
      const { data: healthCheck, error: healthError } = await supabase
        .from('users')
        .select('count')
        .limit(0);

      if (healthError) {
        console.error('❌ Cannot connect to database:', healthError.message);
        console.error('Full error:', JSON.stringify(healthError, null, 2));
      } else {
        console.log('✅ Successfully connected to database');
      }
    } catch (err) {
      console.error('❌ Connection failed:', err);
    }

    // Check for subscriptions table
    console.log('\nChecking for subscriptions table...');
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('count')
        .limit(0);

      if (error) {
        console.error('❌ Subscriptions table error:', error.message);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
      } else {
        console.log('✅ Subscriptions table exists and is accessible');
      }
    } catch (err: any) {
      console.error('❌ Subscriptions check failed:', err.message);
    }

    // Check for response_history table
    console.log('\nChecking for response_history table...');
    try {
      const { data, error } = await supabase
        .from('response_history')
        .select('count')
        .limit(0);

      if (error) {
        console.error('❌ Response_history table error:', error.message);
      } else {
        console.log('✅ Response_history table exists and is accessible');
      }
    } catch (err: any) {
      console.error('❌ Response_history check failed:', err.message);
    }

    // Use raw SQL to check database directly
    console.log('\nChecking database via raw SQL...');
    try {
      const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename IN ('users', 'subscriptions', 'response_history')
          ORDER BY tablename;
        `
      });

      if (tablesError) {
        console.log('⚠️  exec_sql RPC not available (this is okay)');
        console.log('Trying alternative method...');

        // Alternative: try to query pg_tables via PostgREST
        const { data: pgCheck, error: pgError } = await supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'public')
          .in('tablename', ['users', 'subscriptions', 'response_history']);

        if (pgError) {
          console.log('⚠️  Cannot query pg_tables directly:', pgError.message);
        } else {
          console.log('✅ Tables found via pg_tables:', pgCheck);
        }
      } else {
        console.log('✅ Tables found via SQL:', tables);
      }
    } catch (err: any) {
      console.log('⚠️  Raw SQL check failed:', err.message);
    }

    console.log('\n=== DIAGNOSTIC COMPLETE ===\n');

    // This test should always pass - we just want the diagnostic output
    expect(true).toBe(true);
  }, 30000); // 30 second timeout
});
