import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

test.describe('Dashboard Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('when authenticated as manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
      await page.route('**/api/dashboard**', route =>
        route.fulfill({
          status: 200,
          json: {
            success: true,
            data: {
              totalReservations: 12,
              totalCovers: 28,
              currentShiftCapacity: 40,
              noShows: 1,
              newReservations: [],
              upcomingReservations: []
            }
          }
        })
      );
      await page.route('**/api/reservations**', route =>
        route.fulfill({
          status: 200,
          json: { success: true, data: { items: [], total: 0 } }
        })
      );
      await page.route('**/api/billing/**', route =>
        route.fulfill({ status: 200, json: { success: true, data: { status: 'active' } } })
      );
      await page.goto('/dashboard');
    });

    test('renders Dashboard heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });

    test('stat cards are visible', async ({ page }) => {
      await expect(page.getByText(/total reservations/i)).toBeVisible();
    });

    test('View Timeline link navigates to /timeline', async ({ page }) => {
      await page.getByRole('link', { name: /timeline/i }).first().click();
      await expect(page).toHaveURL(/\/timeline/);
    });

    test('shows error state when dashboard API returns 500', async ({ page }) => {
      await page.route('**/api/dashboard**', route => route.fulfill({ status: 500 }));
      await page.reload();
      await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
    });

    test('responsive: stat cards visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByText(/total reservations/i)).toBeVisible();
    });
  });
});
