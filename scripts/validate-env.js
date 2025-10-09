#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * Validates that all required environment variables are present and properly formatted
 */

// Required environment variables
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'ENCRYPTION_KEY'
];

// Optional environment variables
const OPTIONAL_VARS = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_VERCEL_ANALYTICS_ID',
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN'
];

// Validation patterns
const PATTERNS = {
  NEXT_PUBLIC_SUPABASE_URL: /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
  SUPABASE_SERVICE_ROLE_KEY: /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
  OPENAI_API_KEY: /^sk-[a-zA-Z0-9]{48}$/,
  ENCRYPTION_KEY: /^[a-fA-F0-9]{64}$/,
  NEXTAUTH_URL: /^https?:\/\/.+/,
  SENTRY_DSN: /^https:\/\/[a-zA-Z0-9@:%._\+~#=]+\/\d+$/
};

function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');

  let hasErrors = false;
  let hasWarnings = false;

  // Check required variables
  console.log('Required Variables:');
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];

    if (!value) {
      console.log(`❌ ${varName}: Missing`);
      hasErrors = true;
    } else if (PATTERNS[varName] && !PATTERNS[varName].test(value)) {
      console.log(`❌ ${varName}: Invalid format`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName}: Valid`);
    }
  }

  console.log('');

  // Check optional variables
  console.log('Optional Variables:');
  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];

    if (!value) {
      console.log(`⚠️  ${varName}: Not set`);
      hasWarnings = true;
    } else if (PATTERNS[varName] && !PATTERNS[varName].test(value)) {
      console.log(`❌ ${varName}: Invalid format`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName}: Valid`);
    }
  }

  console.log('');

  // Summary
  if (hasErrors) {
    console.log('❌ Environment validation failed!');
    console.log('Please fix the errors above before deploying.');
    console.log('');
    console.log('💡 Helpful resources:');
    console.log('   • Supabase Dashboard: https://app.supabase.com/');
    console.log('   • OpenAI API Keys: https://platform.openai.com/api-keys');
    console.log('   • Generate encryption key: openssl rand -hex 32');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Environment validation completed with warnings.');
    console.log('Some optional features may not work as expected.');
  } else {
    console.log('✅ All environment variables are valid!');
  }

  console.log('');
}

// Load environment variables from .env.local if it exists
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env.local');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');

    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    }
  }
} catch (error) {
  console.log('Could not load .env.local file, using environment variables only');
}

// Run validation
validateEnvironment();