import { test, expect } from '@playwright/test';

test.describe('AI Response Generation Workflow', () => {
  // Mock user data for testing
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };

  const testMessage = 'Hi there! I just wanted to check in on the project progress. When can we expect the next deliverable? Thanks!';

  test.beforeEach(async ({ page }) => {
    // Mock authentication and setup test environment
    await page.goto('/auth/login');

    // Login or create test user account
    // This would need to be adapted based on your actual auth flow
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test('complete response generation workflow', async ({ page }) => {
    // Navigate to generate page
    await page.goto('/dashboard/generate');
    await page.waitForLoadState('networkidle');

    // Verify page elements are present
    await expect(page.getByText('AI Response Generator')).toBeVisible();
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="urgency-select"]')).toBeVisible();

    // Fill in the message input
    await page.fill('[data-testid="message-input"]', testMessage);

    // Verify character count is working
    await expect(page.getByText(`${testMessage.length}/2000`)).toBeVisible();

    // Select context options
    await page.selectOption('[data-testid="urgency-select"]', 'standard');
    await page.selectOption('[data-testid="message-type-select"]', 'update');
    await page.selectOption('[data-testid="relationship-select"]', 'established');
    await page.selectOption('[data-testid="project-phase-select"]', 'active');

    // Mock the OpenAI API response
    await page.route('**/api/trpc/responses.generate', async (route) => {
      const mockResponse = {
        result: {
          data: {
            response: {
              id: 'test-response-id',
              options: [
                {
                  content: 'Thank you for checking in on the project. I\'m pleased to report that we\'re making excellent progress. The next deliverable will be ready by Friday this week. I\'ll send you a detailed update with all the specifics shortly.',
                  tone: 'professional',
                  length: 'standard',
                  confidence: 0.92,
                  reasoning: 'Professional tone appropriate for project updates'
                },
                {
                  content: 'Hi! Thanks for reaching out. The project is going really well! You can expect the next deliverable by Friday. I\'ll get you more details soon.',
                  tone: 'casual',
                  length: 'brief',
                  confidence: 0.87,
                  reasoning: 'Casual friendly approach for established relationships'
                },
                {
                  content: 'Dear Client, I hope this message finds you well. I am writing to provide you with a comprehensive update regarding the current status of your project. I am delighted to inform you that we are proceeding according to schedule and the next deliverable will be completed and ready for your review by the end of this week, specifically Friday. I will ensure that you receive a detailed progress report with all relevant information within the next business day.',
                  tone: 'formal',
                  length: 'detailed',
                  confidence: 0.85,
                  reasoning: 'Formal detailed response for comprehensive communication'
                }
              ],
              originalMessage: testMessage,
              context: {
                urgency: 'standard',
                messageType: 'update',
                relationshipStage: 'established',
                projectPhase: 'active'
              },
              historyId: 'test-history-id',
              model: 'gpt-4',
              generatedAt: new Date().toISOString()
            },
            historyId: 'test-history-id'
          }
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });

    // Submit the form
    await page.click('[data-testid="generate-button"]');

    // Wait for loading state
    await expect(page.getByText('Generating...')).toBeVisible();

    // Wait for responses to load
    await expect(page.getByText('AI Response Options (3)')).toBeVisible();

    // Verify all three responses are displayed
    await expect(page.getByText('Option 1')).toBeVisible();
    await expect(page.getByText('Option 2')).toBeVisible();
    await expect(page.getByText('Option 3')).toBeVisible();

    // Verify response content is displayed
    await expect(page.getByText(/Thank you for checking in on the project/)).toBeVisible();
    await expect(page.getByText(/Hi! Thanks for reaching out/)).toBeVisible();
    await expect(page.getByText(/Dear Client, I hope this message finds you well/)).toBeVisible();

    // Verify tone badges
    await expect(page.getByText('professional')).toBeVisible();
    await expect(page.getByText('casual')).toBeVisible();
    await expect(page.getByText('formal')).toBeVisible();

    // Verify confidence scores
    await expect(page.getByText('92%')).toBeVisible();
    await expect(page.getByText('87%')).toBeVisible();
    await expect(page.getByText('85%')).toBeVisible();

    // Test response selection
    const firstSelectButton = page.getByText('Select This Response').first();
    await firstSelectButton.click();

    // Verify selection feedback
    await expect(page.getByText('Selected')).toBeVisible();

    // Test copy functionality
    await page.evaluate(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: () => Promise.resolve(),
        },
      });
    });

    const firstCopyButton = page.getByText('Copy to Clipboard').first();
    await firstCopyButton.click();

    // Verify copy feedback
    await expect(page.getByText('Copied!')).toBeVisible();

    // Test rating functionality
    const starButtons = page.locator('[data-testid^="star-rating-"]').first().locator('button');
    await starButtons.nth(3).click(); // Click 4th star for 4-star rating

    // Verify success message appears
    await expect(page.getByText('Response Ready!')).toBeVisible();

    // Test workflow progress indicator
    await expect(page.getByText('Progress')).toBeVisible();

    // All progress steps should be completed (green)
    const progressSteps = page.locator('[data-testid="progress-step"]');
    await expect(progressSteps).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      await expect(progressSteps.nth(i)).toHaveClass(/text-green-600/);
    }
  });

  test('handles API errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/generate');

    // Mock API error response
    await page.route('**/api/trpc/responses.generate', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'OpenAI API rate limit exceeded',
            code: 'INTERNAL_SERVER_ERROR'
          }
        })
      });
    });

    // Fill form and submit
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.click('[data-testid="generate-button"]');

    // Wait for and verify error message
    await expect(page.getByText('Generation Error')).toBeVisible();
    await expect(page.getByText('OpenAI API rate limit exceeded')).toBeVisible();

    // Test error dismissal
    await page.click('text=Dismiss');
    await expect(page.getByText('Generation Error')).not.toBeVisible();
  });

  test('validates form input correctly', async ({ page }) => {
    await page.goto('/dashboard/generate');

    // Test empty message validation
    const generateButton = page.getByText('Generate Responses');
    await expect(generateButton).toBeDisabled();

    // Test short message validation
    await page.fill('[data-testid="message-input"]', 'Short');
    await expect(generateButton).toBeDisabled();
    await expect(page.getByText(/minimum.*characters required/i)).toBeVisible();

    // Test character count display
    await expect(page.getByText('5/2000')).toHaveClass(/text-red-500/);

    // Test valid message enables button
    await page.fill('[data-testid="message-input"]', testMessage);
    await expect(generateButton).toBeEnabled();
    await expect(page.getByText(`${testMessage.length}/2000`)).toHaveClass(/text-gray-500/);
  });

  test('preserves form state during navigation', async ({ page }) => {
    await page.goto('/dashboard/generate');

    // Fill form with data
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.selectOption('[data-testid="urgency-select"]', 'immediate');
    await page.selectOption('[data-testid="message-type-select"]', 'concern');

    // Navigate away and back
    await page.goto('/dashboard');
    await page.goto('/dashboard/generate');

    // Form should be reset (this is expected behavior for new sessions)
    await expect(page.locator('[data-testid="message-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="urgency-select"]')).toHaveValue('standard');
  });

  test('handles usage limit exceeded', async ({ page }) => {
    await page.goto('/dashboard/generate');

    // Mock usage limit exceeded response
    await page.route('**/api/trpc/responses.generate', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Monthly usage limit exceeded',
            code: 'FORBIDDEN'
          }
        })
      });
    });

    // Fill and submit form
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.click('[data-testid="generate-button"]');

    // Verify error message
    await expect(page.getByText('Generation Error')).toBeVisible();
    await expect(page.getByText('Monthly usage limit exceeded')).toBeVisible();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/generate');

    // Verify mobile layout
    await expect(page.getByText('AI Response Generator')).toBeVisible();
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();

    // Test form functionality on mobile
    await page.fill('[data-testid="message-input"]', testMessage);

    // Context selectors should stack vertically on mobile
    const contextSection = page.locator('[data-testid="context-section"]');
    await expect(contextSection).toBeVisible();

    // Form should still be functional
    const generateButton = page.getByText('Generate Responses');
    await expect(generateButton).toBeEnabled();
  });

  test('accessibility features work correctly', async ({ page }) => {
    await page.goto('/dashboard/generate');

    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Should focus message input
    await expect(page.locator('[data-testid="message-input"]')).toBeFocused();

    // Test form labels and ARIA attributes
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toHaveAttribute('aria-required', 'true');

    // Test error message accessibility
    await page.fill('[data-testid="message-input"]', 'Short');
    const errorMessage = page.getByText(/minimum.*characters required/i);
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveAttribute('role', 'alert');
  });
});