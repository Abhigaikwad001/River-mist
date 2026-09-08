import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport Responsiveness Suite', () => {

  const mobilePages = [
    { name: 'Homepage', path: '/' },
    { name: 'Packages', path: '/packages' },
    { name: 'Food', path: '/food' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Events', path: '/events' },
    { name: 'Booking', path: '/booking' },
    { name: 'Auth Login', path: '/auth/login' },
    { name: 'Contact', path: '/contact' },
    { name: 'Policies', path: '/policies' },
  ];

  for (const pageInfo of mobilePages) {
    test(`Mobile: ${pageInfo.name} - No horizontal overflow and fits within viewport`, async ({ page }) => {
      // Intercept common APIs on port 3001 to ensure clean rendering
      await page.route(url => url.port === '3001', async route => route.fulfill({ status: 200, body: '[]' }));

      await page.goto(pageInfo.path);
      await page.waitForLoadState('domcontentloaded');

      // Verify no horizontal overflow: scrollWidth must equal clientWidth
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1; // 1px tolerance for subpixel rounding
      });

      expect(hasHorizontalOverflow).toBe(false);
    });
  }

  test('Mobile: Hamburger Navigation toggles and links are tap-friendly', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Hamburger button is only visible on mobile viewports (<1024px)');
    await page.goto('/');

    const mobileMenuButton = page.locator('button[aria-label="Toggle mobile menu"]');
    await expect(mobileMenuButton).toBeVisible();

    // Tap to open mobile drawer
    await mobileMenuButton.click();

    // Verify mobile drawer is visible
    const mobileMenu = page.locator('#mobile-navigation-menu');
    await expect(mobileMenu).toBeVisible();

    // Verify primary navigation links inside mobile menu
    await expect(mobileMenu.locator('a[href="/packages"]')).toBeVisible();
    await expect(mobileMenu.locator('a[href="/food"]')).toBeVisible();
    await expect(mobileMenu.locator('a[href="/gallery"]')).toBeVisible();
    await expect(mobileMenu.locator('a[href="/booking"]').first()).toBeVisible();

    // Tap to close mobile drawer
    await mobileMenuButton.click();
    await expect(mobileMenu).not.toBeVisible();
  });
});
