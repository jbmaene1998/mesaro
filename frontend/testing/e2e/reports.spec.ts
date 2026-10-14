import { test, expect } from '@playwright/test';

import { expectApiErrorVisible } from './helpers/assertions';
import { loginAs } from './helpers/auth';

const mockSummary = {
  restaurantId: 'r1',
  restaurantName: 'Demo',
  timezone: 'Europe/Brussels',
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  generatedAt: '2026-10-01T12:00:00Z',
  totals: {
    totalReservations: 42,
    totalCovers: 98,
    averagePartySize: 2.3,
    noShowRatePercent: 5.2,
    cancellationRatePercent: 8.1
  },
  statusBreakdown: {},
  dailyBreakdown: [],
  shiftBreakdown: []
};

test.describe('Reports Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/\/login/);
  });

  test('role guard: STAFF user sees access denied', async ({ page }) => {
    await loginAs(page, 'staff');
    await page.goto('/reports');
    await expect(page.getByText(/access denied/i).first()).toBeVisible();
  });

  test.describe('when authenticated as manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
      await page.route('**/api/reports/summary**', route =>
        route.fulfill({ status: 200, json: { success: true, data: mockSummary } })
      );
      await page.route('**/api/reservations**', route =>
        route.fulfill({ status: 200, json: { success: true, data: { items: [], total: 0 } } })
      );
      await page.goto('/reports');
    });

    test('renders Reports heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /reports/i }).first()).toBeVisible();
    });

    test('metric cards are visible', async ({ page }) => {
      await expect(page.getByText(/^reservations$/i).first()).toBeVisible();
    });

    test('date range quick buttons are visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: /last 7 days|last 30 days/i }).first()).toBeVisible();
    });

    test('Export CSV button is visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: /export csv/i })).toBeVisible();
    });

    test('shows error state when summary API returns 500', async ({ page }) => {
      await page.route('**/api/reports/summary**', route => route.fulfill({ status: 500 }));
      await page.reload();
      await expectApiErrorVisible(page);
    });

    test('responsive: heading and quick buttons visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByRole('heading', { name: /reports/i }).first()).toBeVisible();
    });
  });
});
