export const serverConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
  encryption: {
    keyId: process.env.ENCRYPTION_KEY_ID || 'default',
    secretKey: process.env.ENCRYPTION_SECRET_KEY || 'dev-encryption-key-change-in-production-32chars',
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
  },
} as const;

export type ServerConfig = typeof serverConfig;