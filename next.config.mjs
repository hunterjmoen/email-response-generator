import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Point to the actual application source
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Use the apps/web/src directory structure
  experimental: {
    externalDir: true,
  },

  // Only ignore errors in development, enforce type safety in production
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },

  // Security headers configuration
  async headers() {
    // Determine allowed origins based on environment
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'];

    // Security headers applied to all routes
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ...(process.env.NODE_ENV === 'production' ? [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ] : []),
    ];

    return [
      {
        // Apply security headers to all routes (except API which handles its own CORS)
        source: '/((?!api).*)',
        headers: securityHeaders,
      },
    ];
  },
}

// Sentry configuration
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  silent: true, // Suppresses all logs
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
}

// Only wrap with Sentry if DSN is configured
export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig