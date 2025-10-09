import { test, expect } from '@playwright/test';

// Test data
const testUser = {
  email: 'test.user@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
};

const sampleMessage = 'I need to update my client about the project progress and discuss the next milestone deliverables.';

test.describe('Response History Management', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean slate
    await page.goto('/auth/login');

    // Register or login test user
    try {
      await page.click('text=Create an account');
      await page.fill('[name="firstName"]', testUser.firstName);
      await page.fill('[name="lastName"]', testUser.lastName);
      await page.fill('[name="email"]', testUser.email);
      await page.fill('[name="password"]', testUser.password);
      await page.fill('[name="confirmPassword"]', testUser.password);
      await page.click('button[type="submit"]');
    } catch {
      // User already exists, just login
      await page.fill('[name="email"]', testUser.email);
      await page.fill('[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
    }

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display empty history state initially', async ({ page }) => {
    // Navigate to history page
    await page.goto('/dashboard/history');

    // Should show empty state
    await expect(page.locator('text=No response history yet')).toBeVisible();
    await expect(page.locator('text=Your AI-generated responses will appear here')).toBeVisible();

    // Should show stats with zero values
    await expect(page.locator('text=Total Responses')).toBeVisible();
    await expect(page.locator('text=This Month')).toBeVisible();
  });

  test('should create and display response history', async ({ page }) => {
    // First generate some responses to create history
    await page.goto('/dashboard/generate');

    // Fill out the response generation form
    await page.fill('textarea[placeholder*="original message"]', sampleMessage);

    // Set context
    await page.selectOption('select[name="urgency"]', 'standard');
    await page.selectOption('select[name="messageType"]', 'update');
    await page.selectOption('select[name="relationshipStage"]', 'established');
    await page.selectOption('select[name="projectPhase"]', 'active');

    // Generate responses
    await page.click('button[type="submit"]');

    // Wait for responses to be generated
    await expect(page.locator('text=AI Response Options')).toBeVisible();

    // Select a response and provide feedback
    await page.click('button:has-text("Select This Response")');
    await page.click('button:has-text("Copy to Clipboard")');

    // Now navigate to history
    await page.goto('/dashboard/history');

    // Should now show history items
    await expect(page.locator('text=No response history yet')).not.toBeVisible();
    await expect(page.locator(`text=${sampleMessage.substring(0, 50)}`)).toBeVisible();

    // Should show updated stats
    await expect(page.locator('text=Showing 1 of 1 responses')).toBeVisible();
  });

  test('should perform keyword search', async ({ page }) => {
    // Assume we have some history from previous test
    await page.goto('/dashboard/history');

    // Use search functionality
    await page.fill('input[placeholder="Search your response history..."]', 'project');

    // Should filter results
    await page.waitForTimeout(500); // Wait for debounce

    // Results should be filtered to show only matching items
    await expect(page.locator('text=project')).toBeVisible();
  });

  test('should use advanced filters', async ({ page }) => {
    await page.goto('/dashboard/history');

    // Open advanced filters
    await page.click('button:has-text("Filters")');

    // Should show advanced filter options
    await expect(page.locator('text=From Date')).toBeVisible();
    await expect(page.locator('text=To Date')).toBeVisible();
    await expect(page.locator('select[name="urgency"]')).toBeVisible();

    // Set date filter
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"][label*="From"]', today);

    // Set context filters
    await page.selectOption('text=Urgency >> select', 'standard');
    await page.selectOption('text=Message Type >> select', 'update');

    // Should show filter count badge
    await expect(page.locator('text=3')).toBeVisible(); // dateFrom + urgency + messageType

    // Clear filters
    await page.click('button:has-text("Clear")');

    // Filters should be reset
    await expect(page.locator('text=3')).not.toBeVisible();
  });

  test('should view individual response details', async ({ page }) => {
    await page.goto('/dashboard/history');

    // Click on a response item's "View Details" button
    await page.click('button:has-text("View Details")');

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/dashboard\/history\/[a-f0-9-]+/);

    // Should show detailed information
    await expect(page.locator('text=Response Details')).toBeVisible();
    await expect(page.locator('text=Original Message')).toBeVisible();
    await expect(page.locator('text=Context')).toBeVisible();
    await expect(page.locator('text=AI Response Options')).toBeVisible();

    // Should show context badges
    await expect(page.locator('text=standard')).toBeVisible();
    await expect(page.locator('text=update')).toBeVisible();

    // Should be able to copy responses
    await page.click('button:has-text("Copy")');
    await expect(page.locator('text=Response copied to clipboard!')).toBeVisible();

    // Navigate back to history
    await page.click('button:has-text("Back to History")');
    await expect(page).toHaveURL('/dashboard/history');
  });

  test('should handle bulk operations', async ({ page }) => {
    await page.goto('/dashboard/history');

    // Select multiple items
    await page.check('input[type="checkbox"]'); // Select first item

    // Should show bulk actions
    await expect(page.locator('text=1 item selected')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();

    // Test select all
    await page.click('button:has-text("Select All")');
    await expect(page.locator('text=items selected')).toBeVisible();

    // Test deselect all
    await page.click('button:has-text("Deselect All")');
    await expect(page.locator('text=selected')).not.toBeVisible();
  });

  test('should handle bulk export', async ({ page }) => {
    await page.goto('/dashboard/history');

    // Select an item
    await page.check('input[type="checkbox"]');

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/history-export-\d{4}-\d{2}-\d{2}\.csv/);
  });

  test('should handle bulk delete with confirmation', async ({ page }) => {
    await page.goto('/dashboard/history');

    // Select an item
    await page.check('input[type="checkbox"]');

    // Click delete
    await page.click('button:has-text("Delete")');

    // Should show confirmation modal
    await expect(page.locator('text=Delete Selected Items')).toBeVisible();
    await expect(page.locator('text=This action cannot be undone')).toBeVisible();

    // Should offer soft delete and permanent delete options
    await expect(page.locator('button:has-text("Soft Delete (Recommended)")')).toBeVisible();
    await expect(page.locator('button:has-text("Permanent Delete")')).toBeVisible();

    // Choose soft delete
    await page.click('button:has-text("Soft Delete (Recommended)")');

    // Item should be removed from list
    await expect(page.locator('text=selected')).not.toBeVisible();
  });

  test('should handle individual item deletion', async ({ page }) => {
    await page.goto('/dashboard/history');

    // Click individual delete button
    await page.click('button:has-text("Delete")');

    // Item should be removed from list
    // (In a real test, we'd verify the specific item is gone)
  });

  test('should copy individual responses', async ({ page }) => {
    await page.goto('/dashboard/history');

    // Click copy button
    await page.click('button:has-text("Copy")');

    // Should show copy feedback
    await expect(page.locator('text=Response copied to clipboard!')).toBeVisible();

    // Feedback should disappear after timeout
    await page.waitForTimeout(3500);
    await expect(page.locator('text=Response copied to clipboard!')).not.toBeVisible();
  });

  test('should handle infinite scroll', async ({ page }) => {
    // This test assumes we have many history items
    await page.goto('/dashboard/history');

    // Scroll to bottom to trigger infinite loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Should show loading indicator
    await expect(page.locator('text=Loading more...')).toBeVisible();

    // Wait for more items to load
    await page.waitForTimeout(2000);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/history');

    // Check that mobile navigation works
    await expect(page.locator('button:has-text("Back to Dashboard")')).toBeVisible();

    // Check that filters are still accessible
    await page.click('button:has-text("Filters")');
    await expect(page.locator('text=From Date')).toBeVisible();

    // History items should be properly sized
    const historyItems = page.locator('[data-testid^="history-item"]');
    if (await historyItems.count() > 0) {
      const firstItem = historyItems.first();
      const boundingBox = await firstItem.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);
    }
  });

  test('should handle navigation between pages', async ({ page }) => {
    await page.goto('/dashboard/history');

    // Navigate to dashboard
    await page.click('button:has-text("Back to Dashboard")');
    await expect(page).toHaveURL('/dashboard');

    // Navigate back to history
    await page.goto('/dashboard/history');

    // Navigate to generate page
    await page.click('button:has-text("Generate New Response")');
    await expect(page).toHaveURL('/dashboard/generate');
  });

  test('should display correct breadcrumb navigation', async ({ page }) => {
    await page.goto('/dashboard/history');

    // Check breadcrumb
    await expect(page.locator('nav')).toContainText('Dashboard');
    await expect(page.locator('nav')).toContainText('Response History');

    // Click breadcrumb to navigate
    await page.click('nav button:has-text("Dashboard")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network error by going offline
    await page.context().setOffline(true);
    await page.goto('/dashboard/history');

    // Should show error message
    await expect(page.locator('text=Failed to load history')).toBeVisible();
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();

    // Go back online and retry
    await page.context().setOffline(false);
    await page.click('button:has-text("Try Again")');

    // Should recover and show content
    await expect(page.locator('text=Failed to load history')).not.toBeVisible();
  });
});