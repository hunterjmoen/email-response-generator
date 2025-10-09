import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should redirect to login page from home', async ({ page }) => {
    // Should redirect to login since user is not authenticated
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('h2')).toContainText('Sign in to your account');
  });

  test('should navigate between authentication pages', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Navigate to register page
    await page.click('text=Don\'t have an account? Sign up');
    await expect(page).toHaveURL('/auth/register');
    await expect(page.locator('h2')).toContainText('Create your account');
    
    // Navigate back to login
    await page.click('text=Already have an account? Sign in');
    await expect(page).toHaveURL('/auth/login');
    
    // Navigate to forgot password
    await page.click('text=Forgot your password?');
    await expect(page).toHaveURL('/auth/forgot-password');
    await expect(page.locator('h2')).toContainText('Reset your password');
    
    // Navigate back to login
    await page.click('text=Back to sign in');
    await expect(page).toHaveURL('/auth/login');
  });

  test('should show validation errors on empty form submission', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Try to submit empty login form
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid email format')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show validation errors on registration form', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Try to submit empty registration form
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
    await expect(page.locator('text=Invalid email format')).toBeVisible();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Enter invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should validate password length on registration', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Fill form with short password
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '1234567'); // 7 characters
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email format')).toBeVisible();
    
    // Enter valid email
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('text=Sending reset email...')).toBeVisible();
  });

  test('should show appropriate loading states', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill form with valid data
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit and check loading state
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Signing in...')).toBeVisible();
  });

  test('should show protected route behavior', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login with redirect parameter
    await expect(page).toHaveURL(/\/auth\/login.*redirect/);
  });

  test('should handle authentication callback', async ({ page }) => {
    // Navigate to auth callback
    await page.goto('/auth/callback');
    
    // Should show loading state
    await expect(page.locator('text=Completing authentication...')).toBeVisible();
    
    // Should eventually redirect (will depend on session state)
    // In a real test, this would redirect to login or dashboard based on auth state
  });
});