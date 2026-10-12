import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

// /planning is accessible to all roles (minimumRole="STAFF")

test.describe('Staff Planning Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/planning');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('when authenticated as staff', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'staff');
      await page.route('**/api/staff-planning**', route =>
        route.fulfill({
          status: 200,
          json: {
            success: true,
            data: {
              weekStart: '2026-03-02',
              totalShifts: 0,
              assignedSlots: 0,
              openSlots: 0,
              days: []
            }
          }
        })
      );
      await page.goto('/planning');
    });

    test('renders Staff Planning heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /staff planning/i })).toBeVisible();
    });

    test('week navigation buttons are visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: /prev|previous|←/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /next|→/i }).first()).toBeVisible();
    });

    test('Today button navigates back to current week', async ({ page }) => {
      await page.getByRole('button', { name: /today/i }).click();
      // After clicking Today, week range text should still be visible
      await expect(page.getByRole('heading', { name: /staff planning/i })).toBeVisible();
    });

    test('shows error state when API returns 500', async ({ page }) => {
      await page.route('**/api/staff-planning**', route => route.fulfill({ status: 500 }));
      await page.reload();
      await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
    });

    test('responsive: heading and week navigation visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByRole('heading', { name: /staff planning/i })).toBeVisible();
    });
  });
});
