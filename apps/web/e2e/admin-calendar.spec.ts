import { test, expect } from '@playwright/test';

test.describe('Phase 18E: Admin Calendar & Capacity Control Center', () => {

  const mockCalendarData = {
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    totalDays: 30,
    totalBookings: 3,
    totalGuests: 725,
    totalEvents: 1,
    totalQuotes: 1,
    days: {
      '2026-09-12': {
        date: '2026-09-12',
        isClosed: false,
        closureReason: null,
        hasOverride: false,
        override: null,
        totalCapacity: 500,
        defaultCapacity: 500,
        bookedCapacity: 45,
        remainingCapacity: 455,
        isSoldOut: false,
        totalBookings: 2,
        totalGuests: 45,
        totalEvents: 1,
        totalQuotes: 1,
        bookings: [
          {
            id: 101,
            bookingNumber: 'RM-2026-000101',
            date: '2026-09-12',
            type: 'DAY_VISIT',
            status: 'CONFIRMED',
            headCountAdult: 4,
            headCountChild: 2,
            totalGuests: 6,
            totalAmount: 7600,
            user: { name: 'Anand Patil', email: 'anand@example.com', phone: '9822001122' },
            package: { name: 'Deluxe Agro Day Visit' },
          },
          {
            id: 102,
            bookingNumber: 'RM-2026-000102',
            date: '2026-09-12',
            type: 'DAY_VISIT',
            status: 'CONFIRMED',
            headCountAdult: 35,
            headCountChild: 4,
            totalGuests: 39,
            totalAmount: 42000,
            user: { name: 'Neha Deshmukh', email: 'neha@example.com', phone: '9822003344' },
            package: { name: 'Family Riverside Retreat' },
          },
        ],
        events: [
          {
            id: 201,
            title: 'Corporate Agro Retreat',
            description: 'Annual corporate gathering',
            eventDate: '2026-09-12',
            startTime: '10:00 AM',
            endTime: '04:00 PM',
            location: 'Lawn Riverside',
            status: 'SCHEDULED',
          },
        ],
        quotes: [
          {
            id: 301,
            quoteNumber: 'WQ-2026-000301',
            eventDate: '2026-09-12',
            eventType: 'WEDDING',
            guestCount: 200,
            total: 350000,
            status: 'SENT',
            user: { name: 'Vikram Joshi', email: 'vikram@example.com', phone: '9822005566' },
          },
        ],
      },
      '2026-09-15': {
        date: '2026-09-15',
        isClosed: true,
        closureReason: 'Monsoon Facility Maintenance',
        hasOverride: true,
        override: {
          id: 5,
          customCapacity: 0,
          isClosed: true,
          reason: 'Monsoon Facility Maintenance',
        },
        totalCapacity: 0,
        defaultCapacity: 500,
        bookedCapacity: 0,
        remainingCapacity: 0,
        isSoldOut: true,
        totalBookings: 0,
        totalGuests: 0,
        totalEvents: 0,
        totalQuotes: 0,
        bookings: [],
        events: [],
        quotes: [],
      },
      '2026-09-20': {
        date: '2026-09-20',
        isClosed: false,
        closureReason: null,
        hasOverride: true,
        override: {
          id: 6,
          customCapacity: 700,
          isClosed: false,
          reason: 'Expanded Garden Lawn Capacity for Festival',
        },
        totalCapacity: 700,
        defaultCapacity: 500,
        bookedCapacity: 680,
        remainingCapacity: 20,
        isSoldOut: false,
        totalBookings: 1,
        totalGuests: 680,
        totalEvents: 0,
        totalQuotes: 0,
        bookings: [
          {
            id: 103,
            bookingNumber: 'RM-2026-000103',
            date: '2026-09-20',
            type: 'DAY_VISIT',
            status: 'CONFIRMED',
            headCountAdult: 600,
            headCountChild: 80,
            totalGuests: 680,
            totalAmount: 550000,
            user: { name: 'Sanjay Shinde', email: 'sanjay@example.com', phone: '9822007788' },
            package: { name: 'Agro Festival Pass' },
          },
        ],
        events: [],
        quotes: [],
      },
    },
    daysList: [],
  };

  test.beforeEach(async ({ page }) => {
    // 1. Mock Super Admin Auth token & user
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock_admin_jwt_phase18e');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'Operations Lead',
        email: 'ops@rivermistresort.com',
        role: 'SUPER_ADMIN',
      }));
    });

    // 2. Mock /users/me verification
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/users/me'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Operations Lead',
          email: 'ops@rivermistresort.com',
          role: 'SUPER_ADMIN',
        }),
      });
    });
  });

  test('1. Admin Calendar loads with proper date-range query parameters and renders grid', async ({ page }) => {
    await page.route(url => url.port === '3001' && url.pathname.includes('/admin/calendar'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCalendarData),
      });
    });

    const requestPromise = page.waitForRequest(req => req.url().includes(':3001/admin/calendar'));
    await page.goto('/admin/calendar');
    const req = await requestPromise;

    // Verify date range parameters are included in the request
    expect(req.url()).toContain('startDate=');
    expect(req.url()).toContain('endDate=');

    // Verify page title
    await expect(page.getByRole('heading', { name: 'Calendar & Capacity Control Center' })).toBeVisible();

    // Verify blackout date badge is rendered
    await expect(page.locator('text=Monsoon Facility Maintenance').first()).toBeVisible();

    // Verify custom override badge is rendered
    await expect(page.locator('text=700').first()).toBeVisible();
  });

  test('2. Daily Operational View displays roster and metrics on date selection', async ({ page }) => {
    await page.route(url => url.port === '3001' && url.pathname.includes('/admin/calendar'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCalendarData),
      });
    });

    await page.goto('/admin/calendar');

    // Wait for the calendar grid to load
    const date12Cell = page.locator('[data-date="2026-09-12"]');
    await expect(date12Cell).toBeVisible();
    await date12Cell.click();

    // Verify Daily Operational View details
    await expect(page.locator('text=Daily Operational View')).toBeVisible();
    await expect(page.locator('text=Anand Patil')).toBeVisible();
    await expect(page.locator('text=Deluxe Agro Day Visit')).toBeVisible();
    await expect(page.locator('text=Corporate Agro Retreat')).toBeVisible();
    await expect(page.locator('text=Vikram Joshi')).toBeVisible();

    // Test tabs
    await page.locator('button:has-text("Bookings (2)")').click();
    await expect(page.locator('text=Anand Patil')).toBeVisible();
    await expect(page.locator('text=Corporate Agro Retreat')).not.toBeVisible();

    await page.locator('button:has-text("Events (1)")').click();
    await expect(page.locator('text=Corporate Agro Retreat')).toBeVisible();
    await expect(page.locator('text=Anand Patil')).not.toBeVisible();

    await page.locator('button:has-text("Quotes (1)")').click();
    await expect(page.locator('text=Vikram Joshi')).toBeVisible();
  });

  test('3. Allows authorized admin to open and submit Daily Capacity Override', async ({ page }) => {
    let overridePayload: any = null;

    await page.route(url => url.port === '3001' && url.pathname.includes('/admin/calendar'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCalendarData),
      });
    });

    await page.route(url => url.port === '3001' && url.pathname === '/capacity/overrides', async route => {
      if (route.request().method() === 'POST') {
        overridePayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 10,
            date: overridePayload.date,
            isClosed: overridePayload.isClosed,
            reason: overridePayload.reason,
            customCapacity: overridePayload.customCapacity,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/admin/calendar');

    // Click on date 12
    const date12Cell = page.locator('[data-date="2026-09-12"]');
    await expect(date12Cell).toBeVisible();
    await date12Cell.click();

    // Click "Manage Capacity" button
    const manageBtn = page.locator('[data-testid="manage-capacity-btn"]');
    await expect(manageBtn).toBeVisible();
    await manageBtn.click();

    // Verify modal is open
    await expect(page.locator('text=Daily Capacity & Blackout Control')).toBeVisible();

    // Fill override reason
    await page.locator('textarea').fill('Special Private Wedding Booking Reserved');

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Verify payload captured
    expect(overridePayload).not.toBeNull();
    expect(overridePayload.reason).toBe('Special Private Wedding Booking Reserved');
  });

  test('4. RBAC: EVENT_MANAGER cannot access Capacity Override mutation button', async ({ page }) => {
    // Override user role to EVENT_MANAGER
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 2,
        name: 'Event Coordinator',
        email: 'events@rivermistresort.com',
        role: 'EVENT_MANAGER',
      }));
    });

    await page.route(url => url.port === '3001' && url.pathname.startsWith('/users/me'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          name: 'Event Coordinator',
          email: 'events@rivermistresort.com',
          role: 'EVENT_MANAGER',
        }),
      });
    });

    await page.route(url => url.port === '3001' && url.pathname.includes('/admin/calendar'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCalendarData),
      });
    });

    await page.goto('/admin/calendar');

    // Operational view can be opened
    const date12Cell = page.locator('[data-date="2026-09-12"]');
    await expect(date12Cell).toBeVisible();
    await date12Cell.click();
    await expect(page.locator('text=Daily Operational View')).toBeVisible();

    // But "Manage Capacity" button should NOT be visible for EVENT_MANAGER
    await expect(page.locator('[data-testid="manage-capacity-btn"]')).not.toBeVisible();
  });

  test('5. Error state with Retry button works gracefully', async ({ page }) => {
    let callCount = 0;
    await page.route(url => url.port === '3001' && url.pathname.includes('/admin/calendar'), async route => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error fetching calendar' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCalendarData),
        });
      }
    });

    await page.goto('/admin/calendar');

    // Error alert and Retry button visible
    await expect(page.locator('text=Internal server error fetching calendar')).toBeVisible();
    const retryBtn = page.locator('button:has-text("Retry")');
    await expect(retryBtn).toBeVisible();

    // Click retry
    await retryBtn.click();

    // Grid should now appear
    await expect(page.locator('text=Daily Operational View')).toBeVisible();
    expect(callCount).toBe(2);
  });
});
