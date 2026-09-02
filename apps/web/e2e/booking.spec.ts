import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should allow a user to register, login, and reach payment summary', async ({ page }) => {
    // 1. Register a new user to ensure we have a fresh account
    const randomSuffix = Math.floor(Math.random() * 100000);
    const email = `testuser${randomSuffix}@example.com`;

    await page.goto('/auth/register');
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Create Account")');

    // Should redirect to login on success
    await expect(page).toHaveURL(/.*\/auth\/login/);

    // 2. Login
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Should redirect to /booking or /
    // For this test, we explicitly navigate to booking if not redirected
    await page.goto('/booking');

    // 3. Date Selection
    // Ensure date input is visible and fill it
    await expect(page.locator('text=When are you visiting?')).toBeVisible();
    
    // Pick tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateStr);

    await page.click('button:has-text("Continue to Packages")');

    // 4. Package Selection
    await expect(page.locator('text=Choose your experience')).toBeVisible();
    
    // Check the first radio button
    await page.locator('input[name="package"]').first().click({ force: true });
    
    await page.click('button:has-text("Continue")');

    // 5. Summary
    await expect(page.locator('text=Review Your Booking')).toBeVisible();
    await expect(page.locator('button:has-text("Proceed to Payment")')).toBeVisible();
  });
});
