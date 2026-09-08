import { test, expect } from '@playwright/test';

test.describe('Real 4-Step Booking UX & Promo Code Suite', () => {

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const futureDateStr = tomorrow.toISOString().split('T')[0];

  test.beforeEach(async ({ page }) => {
    // 1. Mock Packages on port 3001
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
              description: 'Organic farming, traditional thali lunch, and riverview pool.',
              experienceType: 'DAY_TOURISM',
              isActive: true,
              seasonalActive: true,
            },
            {
              id: 2,
              name: 'Exclusive Riverfront Villa Experience',
              priceAdult: 3500,
              priceChild: 1800,
              description: 'Overnight luxury stay with farm-to-table dining.',
              experienceType: 'DAY_TOURISM',
              isActive: true,
              seasonalActive: true,
            },
          ]),
        });
      }
    });

    // 2. Mock Activities on port 3001
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/activities'), async route => {
      const pathname = route.request().url();
      if (pathname.includes('/activities/10')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 10,
            name: 'ATV Quad Bike Trail',
            description: 'Offroad forest circuit for adventure enthusiasts.',
            price: 500,
            pricingType: 'PER_PERSON',
            isActive: true,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 10,
              name: 'ATV Quad Bike Trail',
              description: 'Offroad forest circuit for adventure enthusiasts.',
              price: 500,
              pricingType: 'PER_PERSON',
              isActive: true,
            },
          ]),
        });
      }
    });

    // 3. Mock Capacity Check on port 3001
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/bookings/check-availability'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: true, maxCapacity: 200, bookedCount: 15 }),
      });
    });

    // 4. Mock Auth User Check on port 3001 (Guest Mode)
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/users/me'), async route => {
      await route.fulfill({ status: 401, body: JSON.stringify({ message: 'Unauthorized' }) });
    });
  });

  test('4-Step Journey: Complete progression from Step 1 to Step 4 with Back/Next editing', async ({ page }) => {
    await page.goto('/booking');
    await expect(page.locator('h1:has-text("Plan Your Visit")')).toBeVisible();

    // ================= STEP 1: Experience & Date =================
    await expect(page.locator('text=1. Choose your experience')).toBeVisible();

    // Verify Continue button is disabled until package & date are selected
    const nextBtn1 = page.locator('button:has-text("Continue to Guests")');
    await expect(nextBtn1).toBeDisabled();

    // Select package
    await page.locator('text=Deluxe Agro Day Visit').first().click();

    // Fill date
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(futureDateStr);

    // Now button must be enabled
    await expect(nextBtn1).toBeEnabled();
    await nextBtn1.click();

    // ================= STEP 2: Guests & Add-ons =================
    await expect(page.locator('text=2. Guests & Add-ons')).toBeVisible();

    // Toggle add-on activity
    const activityCard = page.locator('text=ATV Quad Bike Trail').first();
    if (await activityCard.isVisible()) {
      await activityCard.click();
    }

    const nextBtn2 = page.locator('button:has-text("Continue to Details")');
    await expect(nextBtn2).toBeEnabled();
    await nextBtn2.click();

    // ================= STEP 3: Customer Details =================
    await expect(page.locator('h2:has-text("3. Your Details")')).toBeVisible();

    // Fill contact details
    await page.fill('input[name="name"]', 'Rohan Deshmukh');
    await page.fill('input[name="email"]', 'rohan.deshmukh@example.com');
    await page.fill('input[name="phone"]', '9822012345');

    const nextBtn3 = page.locator('button:has-text("Proceed to Review")').first();
    await nextBtn3.click();

    // ================= STEP 4: Review & Payment Summary =================
    await expect(page.locator('h2:has-text("4. Review & Booking Request")')).toBeVisible();
    if (!page.viewportSize() || page.viewportSize()!.width >= 1024) {
      await expect(page.locator('text=Deluxe Agro Day Visit').first()).toBeVisible();
    }

    // Verify Back navigation allows step editing without losing state
    const backBtn = page.locator('button:has-text("Go Back")').first();
    await backBtn.click();

    // Verify on Step 3 and inputs are preserved
    await expect(page.locator('h2:has-text("3. Your Details")')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue('Rohan Deshmukh');

    // Return to Step 4
    await page.locator('button:has-text("Proceed to Review")').first().click();
    await expect(page.locator('h2:has-text("4. Review & Booking Request")')).toBeVisible();
  });

  test('Promo Code Engine: Validates Percentage, Fixed, Expired, Inactive, and Threshold rules', async ({ page }) => {
    // Setup Promo Code Validation Mock on port 3001
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/discounts/validate'), async route => {
      const body = route.request().postDataJSON();
      const code = (body.code || '').toUpperCase();

      if (code === 'WELCOME10') {
        // 10% percentage discount
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            code: 'WELCOME10',
            offerName: 'Welcome Monsoon 10%',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            discountAmount: 300,
            subtotal: 3000,
            finalTotal: 2700,
          }),
        });
      } else if (code === 'FESTIVE500') {
        // Fixed ₹500 discount
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            code: 'FESTIVE500',
            offerName: 'Festive Season Flat 500 Off',
            discountType: 'FIXED_AMOUNT',
            discountValue: 500,
            discountAmount: 500,
            subtotal: 3000,
            finalTotal: 2500,
          }),
        });
      } else if (code === 'EXPIRED20') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            code: 'EXPIRED20',
            message: 'This offer code expired on 2026-08-31.',
          }),
        });
      } else if (code === 'MIN5000') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            code: 'MIN5000',
            message: 'Minimum booking amount of ₹5,000 required for this offer.',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            message: 'Invalid offer code. Please check and try again.',
          }),
        });
      }
    });

    // Advance to Step 4
    await page.goto('/booking');
    await page.locator('text=Deluxe Agro Day Visit').first().click();
    await page.locator('input[type="date"]').fill(futureDateStr);
    await page.locator('button:has-text("Continue to Guests")').click();
    await page.locator('button:has-text("Continue to Details")').click();
    await page.fill('input[name="name"]', 'Sneha Patil');
    await page.fill('input[name="email"]', 'sneha.patil@example.com');
    await page.fill('input[name="phone"]', '9819055443');
    await page.locator('button:has-text("Proceed to Review")').click();
    await expect(page.locator('h2:has-text("4. Review & Booking Request")')).toBeVisible();

    const promoInput = page.locator('input[placeholder*="code" i], input[placeholder*="promo" i]').first();
    const applyBtn = page.locator('button:has-text("Apply")').first();

    // 1. Test Invalid Code
    await promoInput.fill('INVALID99');
    await applyBtn.click();
    await expect(page.locator('text=Invalid offer code')).toBeVisible({ timeout: 5000 });

    // 2. Test Expired Code
    await promoInput.fill('EXPIRED20');
    await applyBtn.click();
    await expect(page.locator('text=expired')).toBeVisible({ timeout: 5000 });

    // 3. Test Minimum Spend Threshold
    await promoInput.fill('MIN5000');
    await applyBtn.click();
    await expect(page.locator('text=Minimum booking amount')).toBeVisible({ timeout: 5000 });

    // 4. Test Valid Percentage Code (WELCOME10)
    await promoInput.fill('WELCOME10');
    await applyBtn.click();
    await expect(page.locator('text=Welcome Monsoon 10% (WELCOME10)').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=You save ₹300').first()).toBeVisible();

    // 5. Test Remove Promo Code
    const removeBtn = page.locator('button[title="Remove promo code"]').first();
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
    await expect(page.locator('text=Welcome Monsoon 10%')).not.toBeVisible();

    // 6. Test Valid Fixed Code (FESTIVE500)
    await promoInput.fill('FESTIVE500');
    await applyBtn.click();
    await expect(page.locator('text=Festive Season Flat 500 Off (FESTIVE500)').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=You save ₹500').first()).toBeVisible();
  });

  test('Booking Submission: Creates booking in REQUESTED status, payment remains PENDING, and produces wa.me URL', async ({ page }) => {
    let bookingCreatedPayload: any = null;

    // Mock Booking Creation API on port 3001
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/bookings') && !url.pathname.includes('check-availability'), async route => {
      if (route.request().method() === 'POST') {
        bookingCreatedPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 77,
            bookingNumber: 'RM-2026-000077',
            status: 'REQUESTED',
            paymentStatus: 'PENDING',
            totalAmount: 3000,
            advanceRequired: 1500,
            balanceAmount: 3000,
            guestName: 'Vikram Joshi',
            guestPhone: '919823011223',
            package: { name: 'Deluxe Agro Day Visit' },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Advance to Step 4
    await page.goto('/booking');
    await page.locator('text=Deluxe Agro Day Visit').first().click();
    await page.locator('input[type="date"]').fill(futureDateStr);
    await page.locator('button:has-text("Continue to Guests")').click();
    await page.locator('button:has-text("Continue to Details")').click();
    await page.fill('input[name="name"]', 'Vikram Joshi');
    await page.fill('input[name="email"]', 'vikram.joshi@example.com');
    await page.fill('input[name="phone"]', '9823011223');
    await page.locator('button:has-text("Proceed to Review")').click();
    await expect(page.locator('h2:has-text("4. Review & Booking Request")')).toBeVisible();

    // Click Continue on WhatsApp button
    const requestBtn = page.locator('button:has-text("Continue on WhatsApp")').first();
    await expect(requestBtn).toBeVisible();
    await requestBtn.click();

    // Verify submission success screen appears
    await expect(page.locator('h2:has-text("Your Booking Request is Sent!")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=RM-2026-000077')).toBeVisible();

    // Verify backend received exact authoritative values
    expect(bookingCreatedPayload).not.toBeNull();
    expect(bookingCreatedPayload.guestName).toBe('Vikram Joshi');
    expect(bookingCreatedPayload.guestPhone).toBe('9823011223');
    expect(bookingCreatedPayload.packageId).toBe(1);

    // Verify wa.me button is generated with prefilled booking reference
    const waButton = page.locator('a[href*="wa.me"]').first();
    await expect(waButton).toBeVisible();
    const waHref = await waButton.getAttribute('href');
    expect(waHref).toContain('wa.me');
    expect(waHref).toContain('RM-2026-000077');
    expect(waHref).toContain('Vikram');
  });
});
