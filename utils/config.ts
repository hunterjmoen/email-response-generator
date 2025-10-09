/**
 * Centralized configuration management for FreelanceFlow
 * Follows the config service pattern mentioned in Dev Notes
 */

interface Config {
  // Environment
  NODE_ENV: string;

  // Supabase Configuration
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // OpenAI Configuration
  OPENAI_API_KEY: string;

  // Security
  ENCRYPTION_KEY: string;

  // Authentication (if using NextAuth)
  NEXTAUTH_URL?: string;
  NEXTAUTH_SECRET?: string;

  // Analytics and Monitoring
  VERCEL_ANALYTICS_ID?: string;
  SENTRY_DSN?: string;
  SENTRY_PUBLIC_DSN?: string;
}

/**
 * Validates that all required environment variables are present
 */
function validateConfig(): Config {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'ENCRYPTION_KEY'
  ];

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Supabase
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,

    // OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,

    // Security
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,

    // Optional - Authentication
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

    // Optional - Analytics and Monitoring
    VERCEL_ANALYTICS_ID: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_PUBLIC_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  };
}

/**
 * Client-side configuration (only public environment variables)
 */
export function getClientConfig() {
  return {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    VERCEL_ANALYTICS_ID: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID,
    SENTRY_PUBLIC_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

/**
 * Server-side configuration (includes sensitive variables)
 * Only use this on the server side (API routes, SSR, etc.)
 */
export function getServerConfig(): Config {
  return validateConfig();
}

/**
 * Development-only configuration checker
 * Warns about missing optional environment variables in development
 */
export function checkDevelopmentConfig() {
  if (process.env.NODE_ENV !== 'development') return;

  const optionalVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_VERCEL_ANALYTICS_ID',
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN'
  ];

  const missing = optionalVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Optional environment variables not set: ${missing.join(', ')}`);
    console.warn('Some features may not work as expected.');
  }
}

// Export singleton config instances
export const config = {
  client: getClientConfig(),
  server: getServerConfig,
  checkDev: checkDevelopmentConfig
};

export default config;