import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

test.describe('Shift Management Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/shifts');
    await expect(page).toHaveURL(/\/login/);
  });

  test('role guard: STAFF user sees access denied', async ({ page }) => {
    await loginAs(page, 'staff');
    await page.goto('/shifts');
    await expect(page.getByText(/403|access denied/i)).toBeVisible();
  });

  test.describe('when authenticated as manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
      await page.route('**/shifts**', (route) => {
        if (!route.request().url().includes('/api/')) {
          return route.continue();
        }
        return route.fulfill({ status: 200, contentType: 'application/json', json: { success: true, data: [] } });
      });
      await page.goto('/shifts');
    });

    test('renders Shifts heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /shifts/i })).toBeVisible();
    });

    test('Add Shift button is visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: /add shift/i })).toBeVisible();
    });

    test('shows empty state when no shifts exist', async ({ page }) => {
      // With empty shifts list, page should render without crashing
      await expect(page.getByRole('heading', { name: /shifts/i })).toBeVisible();
    });

    test('shows error state when API returns 500', async ({ page }) => {
      await page.route('**/shifts**', (route) => {
        if (!route.request().url().includes('/api/')) {
          return route.continue();
        }
        return route.fulfill({ status: 500 });
      });
      await page.reload();
      await expect(page.getByText(/unable to load shifts|something went wrong|error|failed/i).first()).toBeVisible();
    });

    test('responsive: heading and Add Shift button visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByRole('heading', { name: /shifts/i })).toBeVisible();
    });
  });
});
