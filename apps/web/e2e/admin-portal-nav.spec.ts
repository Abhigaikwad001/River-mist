import { test, expect } from '@playwright/test';

test.describe('Admin Portal Navigation and Account Menu', () => {

  test('CASE 1: Unauthenticated visitor has no Admin Portal option and clicking user icon links to /auth/login', async ({ page }) => {
    await page.goto('/');
    // Check that user button/link goes to /auth/login
    const loginLink = page.locator('header a[href="/auth/login"]');
    await expect(loginLink).toBeVisible();

    // Verify no Admin Portal link exists anywhere in the header
    await expect(page.locator('header a:has-text("Admin Portal")')).not.toBeVisible();
  });

  test('CASE 2: Normal USER sees Profile and Logout in Account Menu, but NO Admin Portal option', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake_jwt_user_token');
      localStorage.setItem('user', JSON.stringify({
        id: 2,
        email: 'user@example.com',
        name: 'Regular Customer',
        role: 'USER',
      }));
    });

    await page.route(url => url.port === '3001' && url.pathname.startsWith('/users/me'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          email: 'user@example.com',
          name: 'Regular Customer',
          role: 'USER',
        }),
      });
    });

    await page.goto('/');

    // Open account menu
    const accountBtn = page.locator('#account-menu-button');
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();

    // Profile and Logout should be visible
    await expect(page.locator('header a:has-text("Profile")')).toBeVisible();
    await expect(page.locator('header button:has-text("Logout")')).toBeVisible();

    // Admin Portal MUST NOT be visible
    await expect(page.locator('header a:has-text("Admin Portal")')).not.toBeVisible();
  });

  test('CASE 3: SUPER_ADMIN sees Admin Portal option and clicking it navigates to /admin', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake_jwt_superadmin_token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'admin@rivermist.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      }));
    });

    await page.route(url => url.port === '3001', async route => {
      if (route.request().url().includes('/users/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            email: 'admin@rivermist.com',
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto('/');

    // Open account menu
    const accountBtn = page.locator('#account-menu-button');
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();

    // Profile, Admin Portal, and Logout must be visible
    await expect(page.locator('header a:has-text("Profile")')).toBeVisible();
    const adminPortalLink = page.locator('header a:has-text("Admin Portal")');
    await expect(adminPortalLink).toBeVisible();
    await expect(page.locator('header button:has-text("Logout")')).toBeVisible();

    // Clicking Admin Portal navigates to /admin
    await adminPortalLink.click();
    await expect(page).toHaveURL(/.*\/admin/);
  });

  test('CASE 4: Other admin roles (e.g. BOOKING_MANAGER) see Admin Portal option', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake_jwt_booking_mgr_token');
      localStorage.setItem('user', JSON.stringify({
        id: 3,
        email: 'booking@rivermist.com',
        name: 'Booking Manager',
        role: 'BOOKING_MANAGER',
      }));
    });

    await page.route(url => url.port === '3001', async route => {
      if (route.request().url().includes('/users/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 3,
            email: 'booking@rivermist.com',
            name: 'Booking Manager',
            role: 'BOOKING_MANAGER',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto('/');

    // Open account menu
    const accountBtn = page.locator('#account-menu-button');
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();

    // Admin Portal option should be visible for BOOKING_MANAGER
    const adminPortalLink = page.locator('header a:has-text("Admin Portal")');
    await expect(adminPortalLink).toBeVisible();
    await adminPortalLink.click();
    await expect(page).toHaveURL(/.*\/admin/);
  });

  test('CASE 5: Admin starts at /admin/media, navigates to public pages (/food, /packages), then uses Account Menu to return to /admin', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake_jwt_superadmin_token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'admin@rivermist.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      }));
    });

    await page.route(url => url.port === '3001', async route => {
      if (route.request().url().includes('/users/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            email: 'admin@rivermist.com',
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    // Start at /admin/media
    await page.goto('/admin/media');
    await expect(page).toHaveURL(/.*\/admin\/media/);

    // Browse to public page /food
    await page.goto('/food');
    await expect(page).toHaveURL(/.*\/food/);

    // Open account menu on public page
    const accountBtn = page.locator('#account-menu-button');
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();

    // Admin Portal is available
    const adminPortalLink = page.locator('header a:has-text("Admin Portal")');
    await expect(adminPortalLink).toBeVisible();

    // Return to /admin
    await adminPortalLink.click();
    await expect(page).toHaveURL(/.*\/admin/);
  });

  test('CASE 6: Refresh the browser maintains correct Admin Portal visibility', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake_jwt_superadmin_token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'admin@rivermist.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      }));
    });

    await page.route(url => url.port === '3001' && url.pathname.startsWith('/users/me'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'admin@rivermist.com',
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
        }),
      });
    });

    await page.goto('/gallery');
    await page.reload();

    const accountBtn = page.locator('#account-menu-button');
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();

    await expect(page.locator('header a:has-text("Admin Portal")')).toBeVisible();
  });

  test('CASE 7: Mobile viewport allows opening Account Menu and Admin Portal without layout overflow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake_jwt_superadmin_token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'admin@rivermist.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      }));
    });

    await page.route(url => url.port === '3001' && url.pathname.startsWith('/users/me'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'admin@rivermist.com',
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
        }),
      });
    });

    await page.goto('/');

    // Check account menu button on mobile
    const accountBtn = page.locator('#account-menu-button');
    await expect(accountBtn).toBeVisible();
    await accountBtn.click();

    const adminPortalLink = page.locator('header a:has-text("Admin Portal")');
    await expect(adminPortalLink).toBeVisible();

    // Verify no horizontal document overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px rounding tolerance
  });

});
