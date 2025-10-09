# Environment Variable Setup Guide

This guide covers setting up environment variables for FreelanceFlow deployment on Vercel with Supabase.

## Required Environment Variables

### Supabase Configuration

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Format: `https://your-project-id.supabase.co`
   - Location: Supabase Dashboard → Settings → API
   - Used by: Frontend and backend

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Description: Public anon key for client-side Supabase operations
   - Location: Supabase Dashboard → Settings → API
   - Used by: Frontend

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Description: Service role key for server-side operations
   - Location: Supabase Dashboard → Settings → API
   - Used by: Backend API routes
   - ⚠️ **SENSITIVE** - Never expose to client

### OpenAI Configuration

4. **OPENAI_API_KEY**
   - Description: OpenAI API key for AI response generation
   - Format: `sk-...`
   - Location: OpenAI Dashboard → API Keys
   - Used by: Backend API routes
   - ⚠️ **SENSITIVE** - Never expose to client

### Security

5. **ENCRYPTION_KEY**
   - Description: 32-character key for encrypting sensitive data
   - Format: Random 32-character string
   - Generation: `openssl rand -hex 32`
   - Used by: Backend encryption service
   - ⚠️ **SENSITIVE** - Store securely

## Optional Environment Variables

### Authentication (if using NextAuth)

- **NEXTAUTH_URL**: Your domain URL (e.g., `https://your-app.vercel.app`)
- **NEXTAUTH_SECRET**: Random secret for JWT signing

### Monitoring and Analytics

- **NEXT_PUBLIC_VERCEL_ANALYTICS_ID**: Vercel Analytics ID
- **SENTRY_DSN**: Sentry DSN for server-side error tracking
- **NEXT_PUBLIC_SENTRY_DSN**: Sentry DSN for client-side error tracking

## Environment Setup

### Local Development

1. Copy the template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required values in `.env.local`

3. Verify configuration:
   ```bash
   npm run dev
   ```

### Vercel Production Deployment

#### Method 1: Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with appropriate target environments:
   - Production
   - Preview
   - Development (optional)

#### Method 2: Vercel CLI

```bash
# Set production environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production
vercel env add ENCRYPTION_KEY production

# Optional variables
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
```

#### Method 3: Environment File Upload

1. Create `vercel-env.json`:
   ```json
   {
     "NEXT_PUBLIC_SUPABASE_URL": "your-supabase-url",
     "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
     "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
     "OPENAI_API_KEY": "your-openai-key",
     "ENCRYPTION_KEY": "your-encryption-key"
   }
   ```

2. Import via Vercel dashboard or CLI

## Security Best Practices

### Environment Variable Security

1. **Never commit secrets to Git**
   - `.env.local` is gitignored
   - Use `.env.example` for documentation

2. **Rotate keys regularly**
   - Regenerate API keys periodically
   - Update encryption keys during major updates

3. **Use appropriate prefixes**
   - `NEXT_PUBLIC_` for client-side variables only
   - No prefix for server-side secrets

4. **Validate environment variables**
   - Use the config service pattern
   - Fail fast on missing required variables

### Vercel-Specific Security

1. **Environment targeting**
   - Use different keys for preview vs production
   - Limit sensitive variables to production only

2. **Team access control**
   - Restrict access to environment variables
   - Use Vercel team roles appropriately

## Troubleshooting

### Common Issues

1. **Build fails with missing environment variables**
   - Check that all required variables are set in Vercel
   - Verify variable names match exactly (case-sensitive)

2. **Client-side variables undefined**
   - Ensure variables are prefixed with `NEXT_PUBLIC_`
   - Restart development server after adding variables

3. **Supabase connection errors**
   - Verify Supabase URL and keys are correct
   - Check Supabase project is active

4. **OpenAI API errors**
   - Verify API key is valid and has credits
   - Check API key format (starts with `sk-`)

### Environment Validation

The app includes built-in environment validation:

```typescript
import { config } from '@/utils/config';

// This will throw an error if required variables are missing
const serverConfig = config.server();
```

### Health Check Endpoint

A health check endpoint is available to verify configuration:

```
GET /api/health
```

Returns:
- Environment variable status
- Database connectivity
- External service availability

## Deployment Checklist

- [ ] All required environment variables set in Vercel
- [ ] Supabase project configured and accessible
- [ ] OpenAI API key valid with sufficient credits
- [ ] Database schema deployed to Supabase
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Environment variables validated via health check