import { expect, test } from '@playwright/test';

const SLUG = 'test-restaurant';
const HOLD_TOKEN = 'mock-hold-token-abc123';
const RES_CODE = 'RES-MOCK-001';
const CANCEL_TOKEN = 'cancel-mock-token-001';

test.describe('Embed widget - /embed/:slug', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/availability/closed**', route =>
      route.fulfill({ status: 200, json: { success: true, data: { closed: false } } })
    );
    await page.route('**/api/availability**', route =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            restaurantName: 'Test Restaurant',
            restaurantSlug: SLUG,
            timezone: 'Europe/Brussels',
            locale: 'en',
            minNoticeMinutes: 0,
            maxAdvanceDays: 90,
            maxPartySize: 10,
            slots: [{ time: '19:00', available: true }]
          }
        }
      })
    );
  });

  test('renders booking widget heading', async ({ page }) => {
    await page.goto(`/embed/${SLUG}`);
    await expect(page.getByRole('heading', { name: /test restaurant|test-restaurant/i })).toBeVisible();
  });

  test('date picker is present', async ({ page }) => {
    await page.goto(`/embed/${SLUG}`);
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });

  test('shows error state when availability API fails', async ({ page }) => {
    await page.route('**/api/availability**', route => route.fulfill({ status: 500 }));
    await page.goto(`/embed/${SLUG}`);
    await page.getByRole('button', { name: /check availability/i }).click();
    await expect(page.getByText(/unable to load availability|error|failed/i)).toBeVisible();
  });

  test('responsive: renders at 400 x 700 (typical embed size)', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 700 });
    await page.goto(`/embed/${SLUG}`);
    await expect(page.getByRole('heading', { name: /test restaurant|test-restaurant/i })).toBeVisible();
  });
});

  test.describe('Embed widget - /embed/:slug/confirm/:holdToken', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token: string) => {
      window.sessionStorage.setItem(
        `booking.holdContext.${token}`,
        JSON.stringify({
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          date: '2026-04-01',
          time: '19:00',
          partySize: 2,
          restaurantName: 'Test Restaurant'
        })
      );
    }, HOLD_TOKEN);
    await page.route('**/api/availability**', route =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            restaurantName: 'Test Restaurant',
            restaurantSlug: SLUG,
            timezone: 'Europe/Brussels',
            slots: []
          }
        }
      })
    );
    await page.route('**/api/holds/confirm', route =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            confirmationCode: RES_CODE,
            cancelToken: CANCEL_TOKEN,
            cancelTokenExpiresAt: '2026-04-08T12:00:00Z',
            guestName: 'Alice',
            guestEmail: 'alice@example.com',
            partySize: 2,
            date: '2026-04-01',
            time: '19:00',
            timezone: 'Europe/Brussels',
            shiftName: 'Dinner',
            tableLabels: ['T1']
          }
        }
      })
    );
  });

  test('renders confirmation page heading', async ({ page }) => {
    await page.goto(`/embed/${SLUG}/confirm/${HOLD_TOKEN}`);
    await expect(page.getByRole('heading', { name: /guest details|test restaurant/i })).toBeVisible();
  });

  test('shows confirmation code', async ({ page }) => {
    await page.goto(`/embed/${SLUG}/confirm/${HOLD_TOKEN}`);
    await page.getByLabel(/name/i).fill('Alice');
    await page.getByLabel(/^email$/i).fill('alice@example.com');
    await page.getByRole('button', { name: /confirm reservation/i }).click();
    await expect(page.getByText(RES_CODE)).toBeVisible();
  });

  test('shows error when confirm API returns 410 (expired hold)', async ({ page }) => {
    await page.route('**/api/holds/confirm', route =>
      route.fulfill({ status: 410, json: { success: false, error: { code: 'HOLD_EXPIRED' } } })
    );
    await page.goto(`/embed/${SLUG}/confirm/${HOLD_TOKEN}`);
    await page.getByLabel(/name/i).fill('Alice');
    await page.getByLabel(/^email$/i).fill('alice@example.com');
    await page.getByRole('button', { name: /confirm reservation/i }).click();
    await expect(page.getByText(/expired|unavailable|error/i)).toBeVisible();
  });
});

test.describe('Embed widget - /embed/:slug/reservation/:code', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`**/api/reservations/${RES_CODE}`, route =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            confirmationCode: RES_CODE,
            status: 'CONFIRMED',
            date: '2026-04-01',
            time: '19:00',
            partySize: 2,
            timezone: 'Europe/Brussels',
            shiftName: 'Dinner',
            tableLabels: ['T1']
          }
        }
      })
    );
  });

  test('renders reservation details heading', async ({ page }) => {
    await page.goto(`/embed/${SLUG}/reservation/${RES_CODE}?cancelToken=${CANCEL_TOKEN}`);
    await expect(page.getByText(/loading reservation|reservation/i)).toBeVisible();
  });

  test('shows confirmation code', async ({ page }) => {
    await page.goto(`/embed/${SLUG}/reservation/${RES_CODE}?cancelToken=${CANCEL_TOKEN}`);
    await expect(page.getByText(RES_CODE)).toBeVisible();
  });

  test('shows error when reservation API returns 404', async ({ page }) => {
    await page.route(`**/api/reservations/${RES_CODE}`, route => route.fulfill({ status: 404 }));
    await page.goto(`/embed/${SLUG}/reservation/${RES_CODE}?cancelToken=${CANCEL_TOKEN}`);
    await expect(page.getByText(/not found|unable to load|error/i)).toBeVisible();
  });
});
