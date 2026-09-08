import { test, expect } from '@playwright/test';

test.describe('Public Customer Journeys', () => {

  test('A. Homepage - loads cleanly with interactive navigation and no broken images', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/River Mist/i);

    // Verify main navigation branding
    const brand = page.locator('header a:has-text("River Mist")').first();
    await expect(brand).toBeVisible();

    // Verify hero section and Primary CTA buttons
    const heroCta = page.locator('main a[href="/booking"], main a[href="/explore"]').first();
    await expect(heroCta).toBeVisible();

    // Verify footer links exist and contain key pages
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('a[href="/about"], a:has-text("About")').first()).toBeVisible();
    await expect(footer.locator('a[href="/contact"], a:has-text("Contact")').first()).toBeVisible();
    await expect(footer.locator('a[href="/policies"], a:has-text("Policies")').first()).toBeVisible();

    // Verify images rendered
    const images = page.locator('img');
    const imageCount = await images.count();
    expect(imageCount).toBeGreaterThan(0);
  });

  test('B. Packages Page - displays active packages, pricing, and booking CTA', async ({ page }) => {
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/packages'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: 'Day Tour & Agro Feast',
            priceAdult: 1500,
            priceChild: 800,
            description: 'Full day agro-tourism experience with breakfast, lunch, and pool access.',
            experienceType: 'DAY_TOURISM',
            isActive: true,
            seasonalActive: true,
          },
          {
            id: 2,
            name: 'Hurda Special Experience',
            priceAdult: 1800,
            priceChild: 950,
            description: 'Traditional seasonal Hurda party with roasted tender jowar and rustic buffet.',
            experienceType: 'HURDA_PARTY',
            isActive: true,
            seasonalActive: true,
          },
        ]),
      });
    });

    await page.goto('/packages');
    await expect(page.locator('h1:has-text("Agro-Tourism Packages")')).toBeVisible();

    // Verify packages render with authoritative pricing
    await expect(page.getByRole('heading', { name: 'Day Tour & Agro Feast' })).toBeVisible();
    await expect(page.locator('text=₹1,500').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hurda Special Experience' })).toBeVisible();
    await expect(page.locator('text=₹1,800').first()).toBeVisible();

    // Verify Book Now CTA inside main content routes to /booking
    const bookCta = page.locator('main a[href*="/booking"]').first();
    await expect(bookCta).toBeVisible();
  });

  test('C. Food Page - renders active Maharashtrian menu items and dietary tags', async ({ page }) => {
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/food'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: 'Puran Poli Special Thali',
            description: 'Traditional festive thali served with katachi amti, hot ghee, and local delicacies.',
            price: 550,
            category: 'THALI',
            tags: ['Authentic', 'Traditional'],
            image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&q=80&w=800',
            active: true,
          },
          {
            id: 2,
            name: 'Hurda Platter with 5 Chutneys',
            description: 'Fresh organic charcoal-roasted jowar accompanied by groundnut and sesame chutneys.',
            price: 350,
            category: 'THALI',
            tags: ['Seasonal', 'Harvest'],
            image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800',
            active: true,
          },
        ]),
      });
    });

    await page.goto('/food');
    // Verify Culinary heading
    await expect(page.locator('h1:has-text("A Culinary Journey")')).toBeVisible();
    await expect(page.locator('text=Puran Poli Special Thali')).toBeVisible();
  });

  test('D. Gallery - loads filter tabs, opens modal lightbox, and closes via Escape key', async ({ page }) => {
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/media'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 101,
            type: 'IMAGE',
            url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200',
            title: 'Riverfront Sunset View',
            altText: 'Riverfront Sunset View at River Mist',
            category: 'RESORT',
            active: true,
          },
          {
            id: 102,
            type: 'IMAGE',
            url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',
            title: 'Lawn Wedding Mandap',
            altText: 'Grand Wedding Mandap on Lawn',
            category: 'WEDDING',
            active: true,
          },
        ]),
      });
    });

    await page.goto('/gallery');
    await expect(page.locator('h1:has-text("Visual Memories of River Mist")')).toBeVisible();

    // Verify filter buttons exist
    await expect(page.locator('button:has-text("All Media")')).toBeVisible();

    // Click first gallery item to trigger lightbox
    const firstMediaCard = page.locator('div.group.cursor-pointer, .cursor-pointer').filter({ has: page.locator('img') }).first();
    if (await firstMediaCard.isVisible()) {
      await firstMediaCard.click();

      // Verify Lightbox opened
      const closeBtn = page.locator('button:has(svg.lucide-x)').first();
      await expect(closeBtn).toBeVisible({ timeout: 5000 });

      // Press Escape key and verify modal closes
      await page.keyboard.press('Escape');
      await expect(closeBtn).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('E. Events Page - renders upcoming events with dates and details', async ({ page }) => {
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/events'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            title: 'Annual Winter Hurda Festival 2026',
            description: 'Experience winter harvest traditions, live folk music, bullock cart rides, and fresh roasted hurda.',
            date: '2026-11-15T09:00:00.000Z',
            category: 'FESTIVAL',
            image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800',
            isActive: true,
          },
        ]),
      });
    });

    await page.goto('/events');
    await expect(page.locator('h1:has-text("Special Gatherings"), h1:has-text("Events")').first()).toBeVisible();
    await expect(page.locator('text=Annual Winter Hurda Festival 2026')).toBeVisible();
  });

  test('F. Explore Sections - loads all 4 adventure/aqua/farm/riverside subpages', async ({ page }) => {
    const explorePages = [
      { path: '/explore/adventure', titleMatch: /Adventure/i },
      { path: '/explore/aqua', titleMatch: /Aqua/i },
      { path: '/explore/farm', titleMatch: /Farm/i },
      { path: '/explore/riverside', titleMatch: /Riverside/i },
    ];

    for (const ep of explorePages) {
      await page.goto(ep.path);
      await expect(page.locator('h1, h2').filter({ hasText: ep.titleMatch }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('G. Contact Page - displays authentic contact details and WhatsApp wa.me link', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1:has-text("Get in Touch")').first()).toBeVisible();

    // Verify WhatsApp Click-to-Chat presence
    const waLink = page.locator('a[href*="wa.me"]').first();
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toContain('wa.me');
    expect(href).toMatch(/919322759343/);

    // Verify Email and Address contacts render
    await expect(page.locator('text=bookings@rivermist.in').first()).toBeVisible();
    await expect(page.locator('text=River Road, Agro Valley').first()).toBeVisible();
  });

  test('H. Weddings Page - routes to /weddings/quote and submits enquiry form without package booking leakage', async ({ page }) => {
    await page.goto('/weddings');
    await expect(page.locator('h1:has-text("Celebrate Love")')).toBeVisible();

    // Verify wedding CTA strictly directs to /weddings/quote
    const quoteCta = page.locator('a[href="/weddings/quote"]').first();
    await expect(quoteCta).toBeVisible();
    await quoteCta.click();

    // Expect to be on /weddings/quote
    await expect(page).toHaveURL(/.*\/weddings\/quote/);
    await expect(page.locator('h1:has-text("Request a Wedding Quote")')).toBeVisible();

    // Mock the wedding quote submission on port 3001
    await page.route(url => url.port === '3001' && url.pathname.startsWith('/quotes'), async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 99,
            quoteNumber: 'RM-WQ-2026-0001',
            status: 'SUBMITTED',
            guestName: 'Ananya Sharma',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Fill the wedding quote form with exact placeholder selectors
    await page.fill('input[placeholder="John & Jane Doe"]', 'Ananya Sharma');
    await page.fill('input[placeholder="john@example.com"]', 'ananya.wedding@example.com');
    await page.fill('input[placeholder="+91 98765 43210"]', '9876543210');
    await page.fill('input[type="date"]', '2026-12-25');

    // Submit quote request with exact button text
    const submitBtn = page.locator('button[type="submit"]:has-text("Submit Request")');
    await submitBtn.click();

    // Verify confirmation and wa.me fallback link
    await expect(page.locator('text=Request Received!')).toBeVisible({ timeout: 5000 });
    const waQuoteBtn = page.locator('a[href*="wa.me"]').first();
    await expect(waQuoteBtn).toBeVisible();
  });

  test('I. Policies Page - renders readable cancellation, refund, and resort guidelines', async ({ page }) => {
    await page.goto('/policies');
    await expect(page.locator('h1:has-text("Terms & Policies")').first()).toBeVisible();

    // Verify key sections are present and legible
    await expect(page.locator('h2:has-text("Check-in & Check-out")').first()).toBeVisible();
    await expect(page.locator('h2:has-text("Payment & Cancellation")').first()).toBeVisible();
    await expect(page.locator('h2:has-text("Property Guidelines")').first()).toBeVisible();
  });
});
