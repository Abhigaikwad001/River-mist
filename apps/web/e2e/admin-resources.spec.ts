import { test, expect } from '@playwright/test';

test.describe('Phase 18F: Admin Resources Management & Auditability', () => {
  const mockResourcesData = [
    {
      id: 1,
      name: 'General Day Tourism',
      type: 'CAPACITY',
      capacity: 500,
      description: 'Overall capacity for day visitors',
      active: true,
      _count: { bookingResources: 18 },
    },
    {
      id: 2,
      name: 'Wedding Lawn',
      type: 'VENUE',
      capacity: 1000,
      description: 'Lush green lawn for grand weddings',
      active: true,
      _count: { bookingResources: 6 },
    },
    {
      id: 3,
      name: 'Main Dining',
      type: 'DINING',
      capacity: 200,
      description: 'Main dining area',
      active: true,
      _count: { bookingResources: 18 },
    },
    {
      id: 4,
      name: 'Old Storage Gazebo',
      type: 'VENUE',
      capacity: 30,
      description: 'Archived gazebo',
      active: false,
      _count: { bookingResources: 2 },
    },
  ];

  test.beforeEach(async ({ page }) => {
    // 1. Mock Super Admin Auth token & user
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock_admin_jwt_phase18f');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 1,
          name: 'Super Admin',
          email: 'admin@rivermist.com',
          role: 'SUPER_ADMIN',
        }),
      );
    });

    // 2. Mock /users/me verification
    await page.route(
      (url) => url.port === '3001' && url.pathname.startsWith('/users/me'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            name: 'Super Admin',
            email: 'admin@rivermist.com',
            role: 'SUPER_ADMIN',
          }),
        });
      },
    );
  });

  test('1. Admin Resources page renders KPI cards and resources table with counts', async ({
    page,
  }) => {
    await page.route(
      (url) => url.port === '3001' && url.pathname.startsWith('/resources'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResourcesData),
        });
      },
    );

    await page.goto('/admin/resources');

    // Verify Title & Phase badge
    await expect(page.getByRole('heading', { name: 'Resources & Spaces' })).toBeVisible();
    await expect(page.getByText('Phase 18F')).toBeVisible();

    // Verify KPI Cards
    await expect(page.getByText('Total Spaces')).toBeVisible();
    await expect(page.getByText('Active Spaces')).toBeVisible();
    await expect(page.getByText('Total Active Capacity')).toBeVisible();
    await expect(page.getByText('Inactive / Preserved')).toBeVisible();

    // Verify Table rows
    await expect(page.getByText('General Day Tourism')).toBeVisible();
    await expect(page.getByText('Wedding Lawn')).toBeVisible();
    await expect(page.getByText('Main Dining', { exact: true })).toBeVisible();
    await expect(page.getByText('Old Storage Gazebo')).toBeVisible();

    // Verify Historical Bookings count rendered
    await expect(page.getByText('bookings').first()).toBeVisible();
    await expect(page.getByText('Preserved', { exact: true })).toBeVisible();
  });

  test('2. Filters resources by status (Active / Inactive)', async ({ page }) => {
    await page.route(
      (url) => url.port === '3001' && url.pathname.startsWith('/resources'),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResourcesData),
        });
      },
    );

    await page.goto('/admin/resources');

    // Click Inactive filter
    await page.getByRole('button', { name: /^Inactive/ }).click();

    // Should only see inactive
    await expect(page.getByText('Old Storage Gazebo')).toBeVisible();
    await expect(page.getByText('General Day Tourism')).not.toBeVisible();

    // Click Active filter
    await page.getByRole('button', { name: /^Active/ }).click();
    await expect(page.getByText('General Day Tourism')).toBeVisible();
    await expect(page.getByText('Old Storage Gazebo')).not.toBeVisible();
  });

  test('3. Opens Add Resource modal and submits new resource', async ({ page }) => {
    let postBody: any = null;

    await page.route(
      (url) => url.port === '3001' && url.pathname.startsWith('/resources'),
      async (route) => {
        if (route.request().method() === 'POST') {
          postBody = route.request().postDataJSON();
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 5,
              ...postBody,
              _count: { bookingResources: 0 },
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResourcesData),
          });
        }
      },
    );

    await page.goto('/admin/resources');

    // Click Add Resource
    await page.getByRole('button', { name: 'Add Resource' }).click();

    // Verify modal is open
    await expect(page.getByText('Add New Resource')).toBeVisible();

    // Fill form
    await page.getByPlaceholder(/e\.g\. River Mist Grounds/).fill('River Mist Riverside Deck');
    await page.locator('input[type="number"]').fill('120');

    // Submit
    await page.getByRole('button', { name: 'Create Space' }).click();

    // Verify POST was sent with correct data
    expect(postBody).toEqual(
      expect.objectContaining({
        name: 'River Mist Riverside Deck',
        capacity: 120,
        active: true,
      }),
    );
  });
});
