// Validate required environment variables
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// In production, encryption key is required. In development, use a default key.
function getEncryptionKey(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const key = process.env.ENCRYPTION_SECRET_KEY;

  if (isProduction && !key) {
    throw new Error('ENCRYPTION_SECRET_KEY is required in production');
  }

  if (!key) {
    console.warn('[SECURITY WARNING] Using default encryption key. DO NOT USE IN PRODUCTION!');
    return 'dev-encryption-key-change-in-production-32chars';
  }

  // Validate key length
  if (key.length < 32) {
    throw new Error('ENCRYPTION_SECRET_KEY must be at least 32 characters long');
  }

  return key;
}

export const serverConfig = {
  supabase: {
    url: validateEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRoleKey: validateEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
    anonKey: validateEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  },
  openai: {
    apiKey: validateEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY),
  },
  encryption: {
    keyId: process.env.ENCRYPTION_KEY_ID || 'default',
    secretKey: getEncryptionKey(),
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
  },
} as const;

export type ServerConfig = typeof serverConfig;
