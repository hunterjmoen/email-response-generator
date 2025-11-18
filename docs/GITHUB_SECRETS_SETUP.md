# GitHub Secrets Setup for CI/CD

This document explains how to configure GitHub secrets for continuous integration and deployment.

## Required Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

### 1. NEXT_PUBLIC_SUPABASE_URL
- **Description**: Your Supabase project URL
- **Format**: `https://your-project.supabase.co`
- **Where to find**: Supabase Dashboard → Project Settings → API

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Description**: Supabase anonymous/public key
- **Format**: JWT token starting with `eyJ`
- **Where to find**: Supabase Dashboard → Project Settings → API → anon/public key

### 3. SUPABASE_SERVICE_ROLE_KEY
- **Description**: Supabase service role key (admin access)
- **Format**: JWT token starting with `eyJ`
- **Where to find**: Supabase Dashboard → Project Settings → API → service_role key
- **⚠️ Warning**: Keep this secret! It bypasses Row Level Security

### 4. OPENAI_API_KEY
- **Description**: OpenAI API key for AI response generation
- **Format**: Starts with `sk-`
- **Where to find**: OpenAI Dashboard → API Keys

### 5. ENCRYPTION_KEY
- **Description**: 256-bit encryption key for sensitive data
- **Format**: 64 hexadecimal characters (a-f, 0-9)
- **How to generate**:
  ```bash
  # On Linux/Mac:
  openssl rand -hex 32

  # Or in Node.js:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 6. STRIPE_SECRET_KEY (Optional for deployment)
- **Description**: Stripe secret key for payment processing
- **Format**: Starts with `sk_test_` (test) or `sk_live_` (production)
- **Where to find**: Stripe Dashboard → Developers → API Keys

## Setting Up Secrets

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click "New repository secret"
3. Enter the name exactly as shown above
4. Paste the value
5. Click "Add secret"
6. Repeat for all required secrets

## Verifying Setup

After adding secrets, trigger a new workflow run:
1. Make a small commit and push to your branch
2. Go to Actions tab
3. Check that tests pass

## Security Best Practices

✅ **DO:**
- Use different keys for test/staging/production environments
- Rotate keys regularly
- Use Vercel/deployment platform environment variables for production
- Keep service role keys extremely secure

❌ **DON'T:**
- Commit secrets to git (they're in .gitignore)
- Share service role keys
- Use production keys in CI/CD tests
- Hardcode secrets in code

## Troubleshooting

### Tests failing with "Missing required environment variable"
- Verify the secret name matches exactly (case-sensitive)
- Check that the secret has a value (not empty)
- Re-add the secret if needed

### Build failing with Supabase errors
- Verify NEXT_PUBLIC_SUPABASE_URL format is correct
- Ensure keys are from the same Supabase project
- Check that Row Level Security policies allow test operations

### OpenAI API errors
- Verify API key is active
- Check you have available credits
- Ensure key has correct permissions

## Additional Resources

- [GitHub Encrypted Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Supabase API Settings](https://supabase.com/dashboard)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
