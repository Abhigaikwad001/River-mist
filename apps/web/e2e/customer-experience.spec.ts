import { test, expect } from '@playwright/test';

test.describe('Phase 16: Customer Booking Experience & Resiliency', () => {

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  test.beforeEach(async ({ page }) => {
    // 1. Mock Packages with minGuests requirement
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/packages'), async route => {
      const pathname = route.request().url();
      if (pathname.includes('/packages/1')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            name: 'Deluxe Agro Day Visit',
            priceAdult: 1500,
            priceChild: 800,
            minGuests: 2,
            maxGuests: 50,
            description: 'Organic farming, traditional thali lunch, and riverview pool.',
            experienceType: 'DAY_TOURISM',
            isActive: true,
            seasonalActive: true,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              name: 'Deluxe Agro Day Visit',
              priceAdult: 1500,
              priceChild: 800,
              minGuests: 2,
              maxGuests: 50,
              description: 'Organic farming, traditional thali lunch, and riverview pool.',
              experienceType: 'DAY_TOURISM',
              isActive: true,
              seasonalActive: true,
            },
          ]),
        });
      }
    });

    // 2. Mock Capacity Check on port 3001
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/bookings/check-availability'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: true, maxCapacity: 200, bookedCount: 10 }),
      });
    });

    // 3. Mock Activities
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/activities'), async route => {
      await route.fulfill({ status: 200, body: '[]' });
    });

    // 4. Mock Guest Auth
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/users/me'), async route => {
      await route.fulfill({ status: 401, body: JSON.stringify({ message: 'Unauthorized' }) });
    });
  });

  test('1. Package Selection from /packages passes packageId and pre-selects experience', async ({ page }) => {
    await page.goto('/packages');
    const bookNowLink = page.locator('a[href*="/booking"][href*="packageId=1"]').first();
    await expect(bookNowLink).toBeVisible();
    await bookNowLink.click();

    await expect(page).toHaveURL(/.*\/booking.*packageId=1/);
    await expect(page.locator('text=Deluxe Agro Day Visit').first()).toBeVisible();
  });

  test('2. Step 4 Embedded Reservation Summary & Transparent Payment Roadmap', async ({ page }) => {
    await page.goto('/booking');
    await page.locator('text=Deluxe Agro Day Visit').first().click();
    await page.locator('input[type="date"]').fill(futureDateStr);
    await page.locator('button:has-text("Continue to Guests")').click();

    await expect(page.locator('text=2. Guests & Add-ons')).toBeVisible();
    await page.locator('button:has-text("Continue to Details")').click();

    await expect(page.locator('h2:has-text("3. Your Details")')).toBeVisible();
    await page.fill('input[name="name"]', 'Tanvi Shinde');
    await page.fill('input[name="email"]', 'tanvi.shinde@example.com');
    await page.fill('input[name="phone"]', '9890123456');
    await page.locator('button:has-text("Proceed to Review")').click();

    await expect(page.locator('h2:has-text("4. Review & Booking Request")')).toBeVisible();

    // Verify embedded reservation summary
    await expect(page.locator('text=Reservation Summary')).toBeVisible();
    await expect(page.locator('text=Tanvi Shinde')).toBeVisible();
    await expect(page.locator('text=9890123456')).toBeVisible();

    // Verify transparent commitment message
    await expect(page.locator('text=Transparent Booking Commitment')).toBeVisible();
    await expect(page.locator('text=No payment is taken at this moment')).toBeVisible();
  });

  test('3. Failed booking submission preserves form state and allows safe retry', async ({ page }) => {
    let callCount = 0;
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/bookings') && !url.pathname.includes('check-availability'), async route => {
      if (route.request().method() === 'POST') {
        callCount++;
        if (callCount === 1) {
          // Simulate transient 500 error on first attempt
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Resort capacity service momentarily unavailable. Please retry.' }),
          });
        } else {
          // Succeed on retry
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 99,
              bookingNumber: 'RM-2026-000099',
              status: 'REQUESTED',
              paymentStatus: 'PENDING',
              totalAmount: 3000,
              advanceRequired: 1500,
              balanceAmount: 3000,
              guestName: 'Anil Kadam',
              guestPhone: '9822445566',
              package: { name: 'Deluxe Agro Day Visit' },
            }),
          });
        }
      } else {
        await route.continue();
      }
    });

    await page.goto('/booking');
    await page.locator('text=Deluxe Agro Day Visit').first().click();
    await page.locator('input[type="date"]').fill(futureDateStr);
    await page.locator('button:has-text("Continue to Guests")').click();
    await page.locator('button:has-text("Continue to Details")').click();
    await page.fill('input[name="name"]', 'Anil Kadam');
    await page.fill('input[name="email"]', 'anil.kadam@example.com');
    await page.fill('input[name="phone"]', '9822445566');
    await page.locator('button:has-text("Proceed to Review")').click();

    // Attempt 1: Fails
    const waBtn = page.locator('button:has-text("Continue on WhatsApp")').first();
    await waBtn.click();

    await expect(page.locator('text=Submission Error')).toBeVisible();
    await expect(page.locator('text=Your entered details have been preserved')).toBeVisible();

    // Attempt 2: Retry with Try WhatsApp Again
    const retryBtn = page.locator('button:has-text("Try WhatsApp Again")').first();
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    // Verify success screen renders with reference
    await expect(page.locator('h2:has-text("Your Booking Request is Sent!")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=RM-2026-000099')).toBeVisible();
  });

  test('4. Booking Success page renders full confirmation receipt and next-steps roadmap', async ({ page }) => {
    // Navigate directly to success page with booking params
    await page.goto('/booking/success?bookingNumber=RM-2026-000088&bookingId=88');

    await expect(page.locator('h1:has-text("Booking Request Sent!")')).toBeVisible();
    await expect(page.locator('text=RM-2026-000088')).toBeVisible();
    await expect(page.locator('text=Next Steps')).toBeVisible();
    await expect(page.locator('text=Staff checks availability')).toBeVisible();
    await expect(page.locator('text=Payment instructions')).toBeVisible();
    await expect(page.locator('a[href*="wa.me"]')).toBeVisible();
  });

  test('5. Success Page Security: Normal booking request renders "Booking Request Sent!"', async ({ page }) => {
    await page.route(url => url.pathname.includes('/bookings/status/88'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'REQUESTED' }),
      });
    });

    await page.goto('/booking/success?bookingNumber=RM-2026-000088&bookingId=88');
    await expect(page.locator('h1:has-text("Booking Request Sent!")')).toBeVisible();
    await expect(page.locator('h1:has-text("Booking Confirmed!")')).not.toBeVisible();
    await expect(page.locator('text=Next Steps')).toBeVisible();
  });

  test('6. Success Page Security: Confirmed booking renders "Booking Confirmed!" only with legitimate backend CONFIRMED status', async ({ page }) => {
    await page.route(url => url.pathname.includes('/bookings/status/88'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
    });

    await page.goto('/booking/success?bookingNumber=RM-2026-000088&bookingId=88');
    await expect(page.locator('h1:has-text("Booking Confirmed!")')).toBeVisible();
    await expect(page.locator('h1:has-text("Booking Request Sent!")')).not.toBeVisible();
    await expect(page.locator('text=Confirmed Reservation')).toBeVisible();
  });

  test('7. Success Page Tampering: URL param ?status=CONFIRMED must NOT manufacture confirmation', async ({ page }) => {
    await page.route(url => url.pathname.includes('/bookings/status/88'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'REQUESTED' }),
      });
    });

    await page.goto('/booking/success?bookingNumber=RM-2026-000088&bookingId=88&status=CONFIRMED');
    await expect(page.locator('h1:has-text("Booking Request Sent!")')).toBeVisible();
    await expect(page.locator('h1:has-text("Booking Confirmed!")')).not.toBeVisible();
  });

  test('8. Success Page Tampering: URL param ?bookingId=some-other-id must NOT manufacture confirmation (403/404)', async ({ page }) => {
    await page.route(url => url.pathname.includes('/bookings/status/999999'), async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Forbidden' }),
      });
    });

    await page.goto('/booking/success?bookingNumber=RM-2026-000088&bookingId=999999');
    await expect(page.locator('h1:has-text("Booking Request Sent!")')).toBeVisible();
    await expect(page.locator('h1:has-text("Booking Confirmed!")')).not.toBeVisible();
  });

  test('9. Success Page Tampering: sessionStorage manipulation must NOT manufacture confirmation', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('rm_last_booking', JSON.stringify({
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        bookingNumber: 'RM-TAMPERED-777',
        bookingId: 77,
        totalAmount: 5000,
      }));
    });

    await page.route(url => url.pathname.includes('/bookings/status/77'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'REQUESTED' }),
      });
    });

    await page.goto('/booking/success');
    await expect(page.locator('h1:has-text("Booking Request Sent!")')).toBeVisible();
    await expect(page.locator('h1:has-text("Booking Confirmed!")')).not.toBeVisible();
  });

  test('10. Success Page Tampering: Changed bookingNumber in URL must NOT manufacture confirmation', async ({ page }) => {
    await page.goto('/booking/success?bookingNumber=RM-MANUFACTURED-FAKE');
    await expect(page.locator('h1:has-text("Booking Request Sent!")')).toBeVisible();
    await expect(page.locator('h1:has-text("Booking Confirmed!")')).not.toBeVisible();
    await expect(page.locator('text=RM-MANUFACTURED-FAKE')).toBeVisible();
  });

  test('11. Success Page Security: Manual-payment statuses (REQUESTED, APPROVED, PAYMENT_PENDING) remain "Booking Request Sent!"', async ({ page }) => {
    await page.route(url => url.pathname.includes('/bookings/status/88'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'PAYMENT_PENDING' }),
      });
    });

    await page.goto('/booking/success?bookingNumber=RM-2026-000088&bookingId=88');
    await expect(page.locator('h1:has-text("Booking Request Sent!")')).toBeVisible();
    await expect(page.locator('h1:has-text("Booking Confirmed!")')).not.toBeVisible();
    await expect(page.locator('text=Next Steps')).toBeVisible();
  });

  test('12. Success Page Security: Razorpay verified flow confirmed in backend displays "Booking Confirmed!"', async ({ page }) => {
    await page.route(url => url.pathname.includes('/bookings/status/105'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
    });

    await page.goto('/booking/success?bookingNumber=RM-2026-000105&bookingId=105');
    await expect(page.locator('h1:has-text("Booking Confirmed!")')).toBeVisible();
    await expect(page.locator('h1:has-text("Booking Request Sent!")')).not.toBeVisible();
    await expect(page.locator('text=Confirmed Reservation')).toBeVisible();
  });
});

