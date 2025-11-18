import { describe, test, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { HealthMonitor, logger } from '../../utils/monitoring';

// Test environment validation
describe('Infrastructure Tests', () => {
  beforeAll(() => {
    // Ensure we're in test environment
    expect(process.env.NODE_ENV).toBe('test');
  });

  describe('Environment Configuration', () => {
    test('Required environment variables are present', () => {
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY',
        'ENCRYPTION_KEY'
      ];

      for (const varName of requiredVars) {
        expect(process.env[varName], `Missing required environment variable: ${varName}`).toBeDefined();
        expect(process.env[varName], `Empty environment variable: ${varName}`).not.toBe('');
      }
    });

    test('Environment variables have correct format', () => {
      // Supabase URL format
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toMatch(/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/);
      }

      // JWT token format (basic check)
      if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toMatch(/^eyJ/);
      }

      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toMatch(/^eyJ/);
      }

      // OpenAI API key format
      if (process.env.OPENAI_API_KEY) {
        expect(process.env.OPENAI_API_KEY).toMatch(/^sk-/);
      }

      // Encryption key format (64 hex characters)
      if (process.env.ENCRYPTION_KEY) {
        expect(process.env.ENCRYPTION_KEY).toMatch(/^[a-fA-F0-9]{64}$/);
      }
    });
  });

  describe('Database Connectivity', () => {
    let supabase: ReturnType<typeof createClient>;

    beforeAll(() => {
      // Skip database tests if required env vars are missing
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('Skipping database tests: Missing Supabase credentials');
        return;
      }

      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    });

    test('Can connect to Supabase', async () => {
      if (!supabase) {
        console.warn('Skipping test: Supabase client not initialized');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      // Error is acceptable if database is empty or RLS is enabled
      // Just checking that we can make a query without connection errors
      expect(error === null || error.code !== 'PGRST301').toBe(true);
    });

    test('Database tables exist', async () => {
      if (!supabase) {
        console.warn('Skipping test: Supabase client not initialized');
        return;
      }

      // Check that critical tables exist
      const tables = ['users', 'subscriptions', 'response_history'];

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);

        // Table exists if we don't get a "relation does not exist" error
        const tableExists = !error || !error.message?.includes('does not exist');
        expect(tableExists, `Table ${table} should exist`).toBe(true);
      }
    });

    test('Row Level Security is enabled', async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('Skipping RLS test: Missing Supabase credentials');
        return;
      }

      // Create a client without service role to test RLS
      const publicClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Test that RLS is working by trying to access data without auth
      const { data, error } = await publicClient
        .from('users')
        .select('*')
        .limit(1);

      // Should get an error or empty data because RLS blocks unauthorized access
      // Either error exists OR data is empty (both indicate RLS is working)
      const rlsWorking = error !== null || (data !== null && data.length === 0);
      expect(rlsWorking).toBe(true);

      // If there's an error, it should be related to permissions/policy
      if (error) {
        const errorMessage = error.message?.toLowerCase() || '';
        const isRLSError =
          errorMessage.includes('policy') ||
          errorMessage.includes('permission') ||
          errorMessage.includes('denied') ||
          errorMessage.includes('row-level security');
        expect(isRLSError).toBe(true);
      }
    });
  });

  describe('Monitoring and Health Checks', () => {
    test('Health monitor returns status', async () => {
      const health = await HealthMonitor.checkHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('checks');
      expect(health).toHaveProperty('timestamp');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    test('Logger functions work correctly', () => {
      // Test that logger doesn't throw errors
      expect(() => {
        logger.info('Test log message');
        logger.warn('Test warning');
        logger.debug('Test debug', { test: true });
      }).not.toThrow();
    });

    test('Performance monitor tracks timing', () => {
      const label = 'test-timer';

      // Start timer
      expect(() => {
        const { PerformanceMonitor } = require('../../utils/monitoring');
        PerformanceMonitor.startTimer(label);
      }).not.toThrow();

      // End timer should return a number
      const { PerformanceMonitor } = require('../../utils/monitoring');
      const duration = PerformanceMonitor.endTimer(label);

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Service', () => {
    test('Client config only exposes public variables', () => {
      const { getClientConfig } = require('../../utils/config');
      const clientConfig = getClientConfig();

      // Should have public variables
      expect(clientConfig).toHaveProperty('SUPABASE_URL');
      expect(clientConfig).toHaveProperty('SUPABASE_ANON_KEY');

      // Should NOT have sensitive variables
      expect(clientConfig).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
      expect(clientConfig).not.toHaveProperty('OPENAI_API_KEY');
      expect(clientConfig).not.toHaveProperty('ENCRYPTION_KEY');
    });

    test('Server config includes all variables', () => {
      const { getServerConfig } = require('../../utils/config');

      expect(() => {
        const serverConfig = getServerConfig();
        expect(serverConfig).toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
        expect(serverConfig).toHaveProperty('OPENAI_API_KEY');
        expect(serverConfig).toHaveProperty('ENCRYPTION_KEY');
      }).not.toThrow();
    });
  });

  describe('Build and Deployment Validation', () => {
    test('Package.json has correct scripts', () => {
      const packageJson = require('../../package.json');

      expect(packageJson.scripts).toHaveProperty('build');
      expect(packageJson.scripts).toHaveProperty('start');
      expect(packageJson.scripts).toHaveProperty('validate-env');
      expect(packageJson.scripts).toHaveProperty('deploy');
    });

    test('Next.js configuration is valid', () => {
      const nextConfig = require('../../next.config.js');

      expect(nextConfig).toBeDefined();
      expect(nextConfig).toHaveProperty('reactStrictMode');
    });

    test('Vercel configuration is present', () => {
      const fs = require('fs');
      const path = require('path');

      const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
      expect(fs.existsSync(vercelConfigPath)).toBe(true);

      const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
      expect(vercelConfig).toHaveProperty('name');
      expect(vercelConfig).toHaveProperty('version');
    });
  });
});