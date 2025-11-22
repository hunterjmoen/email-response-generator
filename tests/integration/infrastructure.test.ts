import { describe, test, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { HealthMonitor, logger, PerformanceMonitor } from '../../utils/monitoring';
import { getClientConfig, getServerConfig } from '../../utils/config';

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
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    });

    test('Can connect to Supabase', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('Database tables exist', async () => {
      // Check that critical tables exist
      const tables = ['users', 'subscriptions', 'response_history'];

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);

        expect(error, `Table ${table} should exist`).toBeNull();
      }
    });

    test('Row Level Security is enabled', async () => {
      // Test that RLS is working by trying to access data without auth
      const { error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      // Should get an error because RLS blocks unauthorized access
      expect(error).toBeDefined();
      expect(error?.message).toContain('policy');
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
        PerformanceMonitor.startTimer(label);
      }).not.toThrow();

      // End timer should return a number
      const duration = PerformanceMonitor.endTimer(label);

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Service', () => {
    test('Client config only exposes public variables', () => {
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