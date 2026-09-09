import { test, expect } from '@playwright/test';

test.describe('Phase 17: River Mist Owner & Operations Control Center', () => {

  const mockDashboardSummary = {
    timestamp: '2026-09-09T11:30:00.000Z',
    attentionRequired: {
      pendingBookingsCount: 5,
      paymentPendingCount: 3,
      outstandingBalanceCount: 2,
      pendingQuotesCount: 4,
      totalActionItems: 14,
    },
    today: {
      dateStr: 'Wed, 9 Sep 2026',
      bookingsCount: 8,
      confirmedBookingsCount: 6,
      totalGuests: 24,
      revenueReceived: 12500,
      eventsCount: 2,
    },
    revenue: {
      moneyReceived: {
        today: 12500,
        thisWeek: 48000,
        thisMonth: 185000,
        allTime: 850000,
      },
      bookingValue: {
        confirmedValue: 240000,
        totalActiveValue: 390000,
      },
      outstandingBalance: 55000,
      paymentPendingAmount: 32000,
    },
    bookingStatuses: {
      requested: 5,
      approved: 2,
      paymentPending: 3,
      confirmed: 28,
      cancelled: 4,
      completed: 42,
    },
    pendingActions: [
      {
        id: 'action-pending-bookings',
        type: 'BOOKING_REQUEST',
        title: '5 booking requests awaiting review',
        description: 'Verify date & capacity availability before approving payment instructions.',
        count: 5,
        urgency: 'HIGH',
        link: '/admin/bookings?status=REQUESTED',
        buttonLabel: 'Review Bookings',
      },
      {
        id: 'action-payment-pending',
        type: 'PAYMENT_PENDING',
        title: '3 bookings awaiting payment',
        description: 'Payment instructions dispatched. Check UPI/Bank records to record payment.',
        count: 3,
        urgency: 'HIGH',
        link: '/admin/bookings?status=PAYMENT_PENDING',
        buttonLabel: 'Review Payments',
      },
      {
        id: 'action-pending-quotes',
        type: 'WEDDING_QUOTE',
        title: '4 wedding/event quotes need follow-up',
        description: 'Enquiries submitted via quote builder. Review and send custom proposal.',
        count: 4,
        urgency: 'MEDIUM',
        link: '/admin/quotes',
        buttonLabel: 'View Quotes',
      },
    ],
    upcomingBookings: [
      {
        id: 101,
        bookingNumber: 'RM-2026-000101',
        packageName: 'Deluxe Agro Day Visit',
        date: '2026-09-12T09:00:00.000Z',
        headCountAdult: 4,
        headCountChild: 2,
        status: 'CONFIRMED',
        totalAmount: 7600,
        amountPaid: 3800,
        balanceAmount: 3800,
        customerName: 'Anand Patil',
      },
      {
        id: 102,
        bookingNumber: 'RM-2026-000102',
        packageName: 'Family Riverside Retreat',
        date: '2026-09-15T10:00:00.000Z',
        headCountAdult: 6,
        headCountChild: 0,
        status: 'CONFIRMED',
        totalAmount: 12000,
        amountPaid: 12000,
        balanceAmount: 0,
        customerName: 'Neha Deshmukh',
      },
    ],
    weddingEnquiries: [
      {
        id: 501,
        quoteNumber: 'WQ-2026-000501',
        eventDate: '2026-11-28T00:00:00.000Z',
        guestCount: 300,
        total: 450000,
        status: 'SENT',
        eventType: 'WEDDING',
        createdAt: '2026-09-05T14:00:00.000Z',
        contactName: 'Vikram Joshi',
        contactPhone: '9822001122',
      },
    ],
    recentActivity: [
      {
        id: 901,
        action: 'STATUS_CHANGE',
        entityType: 'BOOKING',
        description: 'Booking RM-2026-000101 status updated to CONFIRMED',
        actorName: 'Super Admin',
        actorRole: 'SUPER_ADMIN',
        createdAt: '2026-09-09T10:15:00.000Z',
      },
    ],
  };

  test.beforeEach(async ({ page }) => {
    // 1. Mock Admin Auth token & user
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock_admin_jwt_phase17');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'Operations Manager',
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
          name: 'Operations Manager',
          email: 'ops@rivermistresort.com',
          role: 'SUPER_ADMIN',
        }),
      });
    });

    // 3. Mock /admin/dashboard/summary API
    await page.route(url => url.port === '3001' && url.pathname.includes('/admin/dashboard/summary'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardSummary),
      });
    });

    // 4. Mock /bookings list for deep links
    await page.route(url => url.port === '3001' && url.pathname === '/bookings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 101,
            bookingNumber: 'RM-2026-000101',
            status: 'REQUESTED',
            totalAmount: 5000,
            amountPaid: 0,
            balanceAmount: 5000,
            advanceRequired: 2500,
            date: '2026-09-12T00:00:00.000Z',
            package: { name: 'Deluxe Agro Day Visit' },
            user: { name: 'Anand Patil', email: 'anand@example.com', phone: '9822001122' },
          },
        ]),
      });
    });
  });

  test('1. Dashboard Header & Attention Required Section render operational alerts and action deep links', async ({ page }) => {
    await page.goto('/admin');

    // Header validation
    await expect(page.locator('h1:has-text("Operations Control Center")')).toBeVisible();
    await expect(page.locator('text=Wed, 9 Sep 2026')).toBeVisible();
    await expect(page.locator('text=Operations Manager')).toBeVisible();
    await expect(page.locator('text=SUPER_ADMIN')).toBeVisible();

    // Attention Required Banner
    await expect(page.locator('text=Attention Required Today (14 Action Items)')).toBeVisible();
    await expect(page.locator('text=Pending Requests').first()).toBeVisible();
    await expect(page.locator('text=Awaiting Payment').first()).toBeVisible();
    await expect(page.locator('text=Partial Payments').first()).toBeVisible();
    await expect(page.locator('text=Wedding Enquiries').first()).toBeVisible();

    // Click "Pending Requests" -> should navigate to /admin/bookings?status=REQUESTED
    await page.locator('a[href*="/admin/bookings?status=REQUESTED"]').first().click();
    await expect(page).toHaveURL(/.*\/admin\/bookings\?status=REQUESTED/);
  });

  test('2. Today Operations Snapshot & Financial Truth Section strictly separate Money Received from Booking Value', async ({ page }) => {
    await page.goto('/admin');

    // Today's Operations
    await expect(page.locator('text=Total Guests Today')).toBeVisible();
    await expect(page.locator('p:has-text("24")').first()).toBeVisible();
    await expect(page.locator('text=Confirmed Visits')).toBeVisible();
    await expect(page.locator('text=Collected Today')).toBeVisible();

    // Financial Truth: Money Received vs. Booking Value
    await expect(page.locator('h2:has-text("Financial Truth: Money Received vs. Booking Value")')).toBeVisible();
    await expect(page.locator('h3:has-text("Money Received")')).toBeVisible();
    await expect(page.locator('text=Real Cash In Hand')).toBeVisible();
    await expect(page.locator('h3:has-text("Booking Pipeline & Balances")')).toBeVisible();
    await expect(page.locator('text=Contracted Value')).toBeVisible();

    // Money Received values
    await expect(page.locator('text=₹12,500').first()).toBeVisible(); // Today's collected
    await expect(page.locator('text=₹48,000')).toBeVisible(); // Week
    await expect(page.locator('text=₹1,85,000')).toBeVisible(); // Month
    await expect(page.locator('text=₹8,50,000')).toBeVisible(); // All-time

    // Booking Value figures
    await expect(page.locator('text=₹2,40,000')).toBeVisible(); // Confirmed pipeline
    await expect(page.locator('text=₹3,90,000')).toBeVisible(); // Total pipeline
    await expect(page.locator('text=₹55,000')).toBeVisible(); // Outstanding balance
  });

  test('3. Booking Status Distribution Cards allow immediate status filtering', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.locator('text=Booking Status Breakdown')).toBeVisible();
    await expect(page.locator('a[href*="/admin/bookings?status=REQUESTED"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/admin/bookings?status=CONFIRMED"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/admin/bookings?status=PAYMENT_PENDING"]').first()).toBeVisible();

    // Click "Payment Due" filter
    await page.locator('a[href*="/admin/bookings?status=PAYMENT_PENDING"]').first().click();
    await expect(page).toHaveURL(/.*\/admin\/bookings\?status=PAYMENT_PENDING/);
  });

  test('4. Priority Actions, Upcoming Bookings, Wedding Enquiries, and Audit Feed render cleanly', async ({ page }) => {
    await page.goto('/admin');

    // Priority actions
    await expect(page.locator('text=Priority Operational Actions')).toBeVisible();
    await expect(page.locator('h4:has-text("5 booking requests awaiting review")')).toBeVisible();
    await expect(page.locator('a[href*="/admin/bookings?status=REQUESTED"]:has-text("Review Bookings")')).toBeVisible();

    // Upcoming bookings
    await expect(page.locator('h3:has-text("Upcoming Resort Bookings")')).toBeVisible();
    await expect(page.locator('td:has-text("RM-2026-000101")').first()).toBeVisible();
    await expect(page.locator('text=Anand Patil')).toBeVisible();
    await expect(page.locator('text=Deluxe Agro Day Visit')).toBeVisible();

    // Wedding Enquiries
    await expect(page.locator('h3:has-text("Event Enquiries")')).toBeVisible();
    await expect(page.locator('text=WQ-2026-000501')).toBeVisible();
    await expect(page.locator('text=Vikram Joshi')).toBeVisible();

    // Audit Trail
    await expect(page.locator('h3:has-text("Recent Audit Trail")')).toBeVisible();
    await expect(page.locator('text=Booking RM-2026-000101 status updated to CONFIRMED')).toBeVisible();
  });

  test('5. Mobile Responsiveness: Dashboard renders cleanly on Pixel 7 viewport (412x915) without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/admin');

    await expect(page.locator('h1:has-text("Operations Control Center")')).toBeVisible();

    // Check no horizontal scrollbar on body
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Refresh button is tap-friendly
    const refreshBtn = page.locator('button:has-text("Refresh Operations")');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(refreshBtn).toBeEnabled();
  });

  test('6. Non-destructive error recovery preserves layout and offers Retry', async ({ page }) => {
    let callCount = 0;
    await page.route(url => url.port === '3001' && url.pathname.includes('/admin/dashboard/summary'), async route => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Database connection temporarily paused.' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardSummary),
        });
      }
    });

    await page.goto('/admin');
    await expect(page.locator('text=Database connection temporarily paused.')).toBeVisible();

    // Click retry
    await page.locator('button:has-text("Retry")').click();
    await expect(page.locator('h1:has-text("Operations Control Center")')).toBeVisible();
    await expect(page.locator('text=Attention Required Today')).toBeVisible();
  });
});
