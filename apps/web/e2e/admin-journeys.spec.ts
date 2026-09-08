import { test, expect } from '@playwright/test';

test.describe('Admin Authentication & Booking Workflow', () => {

  test('Authentication: Login with invalid password displays error, valid credentials grants access, and unauthenticated access redirects', async ({ page }) => {
    // 1. Test unauthorized redirection
    await page.goto('/admin');
    // Without token, AdminAuthWrapper redirects to /auth/login
    await expect(page).toHaveURL(/.*\/auth\/login/);

    // Mock Login endpoint on port 3001
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/auth/login'), async route => {
      const body = route.request().postDataJSON();
      if (body.password === 'WrongPassword123!') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid email or password.' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'fake_jwt_admin_token_test',
          }),
        });
      }
    });

    // Mock /users/me on port 3001
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/users/me'), async route => {
      const token = route.request().headers()['authorization'];
      if (token && token.includes('fake_jwt_admin_token_test')) {
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
        await route.fulfill({ status: 401, body: JSON.stringify({ message: 'Unauthorized' }) });
      }
    });

    // 2. Test Invalid Password
    await page.fill('input[type="email"]', 'admin@rivermist.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });

    // 3. Test Valid Login
    await page.fill('input[type="password"]', 'CorrectAdminPassword123!');
    await page.click('button:has-text("Sign In")');

    // Should redirect to /admin
    await expect(page).toHaveURL(/.*\/admin/);
    await expect(page.locator('text=Admin Portal').first()).toBeVisible();

    // 4. Test Logout
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/.*\/auth\/login/);
    }
  });

  test('Admin Bookings: Availability Confirmation, Approved Status Transition, and Payment QR Dialog', async ({ page }) => {
    // Inject admin authentication in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake_jwt_admin_token_test');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'admin@rivermist.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      }));
    });

    let bookingList = [
      {
        id: 101,
        bookingNumber: 'RM-2026-000101',
        guestName: 'Anand Kulkarni',
        guestPhone: '919876543210',
        guestEmail: 'anand@example.com',
        user: {
          name: 'Anand Kulkarni',
          phone: '919876543210',
          email: 'anand@example.com',
        },
        packageName: 'Day Visit Agro Tour',
        date: '2026-10-10T10:00:00.000Z',
        headCountAdult: 4,
        headCountChild: 1,
        totalAmount: 6800,
        advanceRequired: 3400,
        amountPaid: 0,
        balanceAmount: 6800,
        status: 'REQUESTED',
        paymentStatus: 'PENDING',
        payments: [],
      },
    ];

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

    await page.route(url => url.port === '3001' && url.pathname === '/bookings', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(bookingList),
        });
      } else {
        await route.continue();
      }
    });

    // Mock confirm-availability on port 3001
    await page.route(url => url.port === '3001' && url.pathname.includes('/confirm-availability'), async route => {
      bookingList[0].status = 'APPROVED';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(bookingList[0]),
      });
    });

    // Mock payment-qr endpoint on port 3001
    await page.route(url => url.port === '3001' && url.pathname.includes('/payment-qr'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bookingId: 101,
          bookingNumber: 'RM-2026-000101',
          recipientPhone: '919876543210',
          financials: {
            totalAmount: 6800,
            advanceRequired: 3400,
            amountPaid: 0,
            balanceAmount: 6800,
            amountRequested: 3400,
          },
          upiId: 'rivermist@icici',
          upiUri: 'upi://pay?pa=rivermist@icici&pn=River%20Mist&am=3400.00&cu=INR&tn=RM-2026-000101',
          qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          fallbackUrl: 'https://wa.me/919876543210?text=Payment%20Instructions%20for%20RM-2026-000101',
        }),
      });
    });

    // Mock send-payment-request endpoint on port 3001
    await page.route(url => url.port === '3001' && url.pathname.includes('/send-payment-request'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'SENT',
          messageId: 'wamid.HBgNNjYwMDE=',
          fallbackUrl: 'https://wa.me/919876543210?text=Payment%20QR',
        }),
      });
    });

    await page.goto('/admin/bookings');
    await expect(page.locator('h1:has-text("Bookings Management")')).toBeVisible();

    // 1. Verify REQUESTED booking is displayed
    await expect(page.locator('text=RM-2026-000101')).toBeVisible();
    await expect(page.locator('text=Anand Kulkarni').first()).toBeVisible();

    // 2. Verify Confirm Availability button is visible for REQUESTED booking
    const confirmAvailBtn = page.locator('button:has-text("Confirm Availability")').first();
    await expect(confirmAvailBtn).toBeVisible();

    // Handle the browser alert dialog automatically
    page.once('dialog', dialog => dialog.accept());
    await confirmAvailBtn.click();

    // 3. Verify status transitions to APPROVED
    await expect(page.locator('text=APPROVED').first()).toBeVisible({ timeout: 5000 });

    // 4. Verify Payment QR / Request Payment button appears now that it is APPROVED
    const qrBtn = page.locator('button:has-text("Payment QR"), button[title="View Payment QR / Send WhatsApp"]').first();
    await expect(qrBtn).toBeVisible();
    await qrBtn.click();

    // 5. Verify Payment Request Modal opens with authoritative financial details
    await expect(page.locator('text=Anand Kulkarni').first()).toBeVisible();
    await expect(page.locator('text=919876543210').first()).toBeVisible();
    await expect(page.locator('text=₹3,400').first()).toBeVisible();

    // 6. Verify Send WhatsApp button triggers confirmation dialog
    const sendPaymentBtn = page.locator('button:has-text("Send WhatsApp Request")').first();
    await expect(sendPaymentBtn).toBeVisible();
    await sendPaymentBtn.click();

    // In confirmation dialog, check Cancel and Confirm & Send buttons
    await expect(page.locator('h4:has-text("Send Payment Request?")')).toBeVisible();
    const confirmDialogBtn = page.locator('div:has-text("Send Payment Request?") button:has-text("Send Payment Request")').first();
    await confirmDialogBtn.click();

    // Verify WhatsApp dispatch result and Click-to-Chat fallback are rendered
    await expect(page.locator('text=Payment QR Image & Instructions Dispatched via WhatsApp')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Click-to-Chat Fallback (wa.me) Ready:')).toBeVisible();
  });
});
