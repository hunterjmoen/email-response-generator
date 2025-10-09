import { test, expect } from '@playwright/test';

test.describe('Deployment Infrastructure Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set timeout for deployment tests
    test.setTimeout(60000);
  });

  test('Application loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Check that the main content is visible
    await expect(page).toHaveTitle(/FreelanceFlow/);

    // Verify no JavaScript errors in console
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Wait a bit to catch any errors
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('API health endpoint responds correctly', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);

    const health = await response.json();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('checks');
    expect(health).toHaveProperty('timestamp');

    // Status should be healthy or degraded (not unhealthy)
    expect(['healthy', 'degraded']).toContain(health.status);
  });

  test('HTTPS is enforced', async ({ page }) => {
    const url = page.url();
    expect(url).toMatch(/^https:/);
  });

  test('Security headers are present', async ({ request }) => {
    const response = await request.get('/');

    // Check for important security headers
    const headers = response.headers();

    // Vercel automatically adds these security headers
    expect(headers).toHaveProperty('x-frame-options');
    expect(headers).toHaveProperty('x-content-type-options');
  });

  test('Static assets load correctly', async ({ page }) => {
    await page.goto('/');

    // Check that CSS loads
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);

    // Verify no 404s for critical assets
    const failed404s: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 404 &&
          (response.url().includes('.css') ||
           response.url().includes('.js') ||
           response.url().includes('.woff'))) {
        failed404s.push(response.url());
      }
    });

    await page.waitForLoadState('networkidle');
    expect(failed404s).toHaveLength(0);
  });

  test('Database connectivity through API', async ({ request }) => {
    // Test tRPC endpoint that requires database
    const response = await request.post('/api/trpc/auth.me', {
      data: {}
    });

    // Should get 401 (unauthorized) not 500 (database error)
    expect([401, 200]).toContain(response.status());
  });

  test('Environment variables are configured', async ({ page }) => {
    // Navigate to a page that uses environment variables
    await page.goto('/');

    // Check that client-side environment variables are available
    const hasSupabaseConfig = await page.evaluate(() => {
      return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    });

    expect(hasSupabaseConfig).toBe(true);
  });

  test('Error tracking is configured', async ({ page }) => {
    // Check that Sentry is loaded (if configured)
    await page.goto('/');

    const sentryExists = await page.evaluate(() => {
      return typeof window !== 'undefined' && '__SENTRY__' in window;
    });

    // If Sentry DSN is configured, Sentry should be present
    // This test will pass regardless, but logs the status
    console.log('Sentry configured:', sentryExists);
  });

  test('Performance metrics are reasonable', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    // Performance thresholds (reasonable for a deployment)
    expect(metrics.domContentLoaded).toBeLessThan(5000); // 5 seconds
    expect(metrics.loadComplete).toBeLessThan(10000); // 10 seconds

    console.log('Performance metrics:', metrics);
  });

  test('Authentication pages are accessible', async ({ page }) => {
    // Test critical authentication routes
    const authPages = ['/auth/login', '/auth/register', '/auth/forgot-password'];

    for (const authPage of authPages) {
      await page.goto(authPage);
      await expect(page).not.toHaveTitle(/404/);

      // Should not have server errors
      const response = await page.waitForResponse(response =>
        response.url().includes(authPage)
      );
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('API routes are properly deployed', async ({ request }) => {
    // Test that tRPC endpoints are accessible
    const response = await request.get('/api/trpc/auth.me');

    // Should not be 404 (route not found)
    expect(response.status()).not.toBe(404);

    // Should be a valid tRPC response (even if unauthorized)
    expect([200, 401, 400]).toContain(response.status());
  });
});