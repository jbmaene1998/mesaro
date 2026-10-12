import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

test.describe('Vacations & Closures Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/vacations');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('when authenticated as manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
      await page.route('**/api/vacations**', route =>
        route.fulfill({ status: 200, json: { success: true, data: [] } })
      );
      await page.goto('/vacations');
    });

    test('renders Vacations & Closures heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /vacations|closures/i })
      ).toBeVisible();
    });

    test('tabs for Restaurant Closures and Staff Vacations are visible', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /closures/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /vacations/i })).toBeVisible();
    });

    test('switching to Staff Vacations tab shows Request Vacation button', async ({ page }) => {
      await page.getByRole('tab', { name: /staff vacations/i }).click();
      await expect(page.getByRole('button', { name: /request vacation/i })).toBeVisible();
    });

    test('Add Closure button is visible on closures tab', async ({ page }) => {
      await page.getByRole('tab', { name: /closures/i }).click();
      await expect(page.getByRole('button', { name: /add closure/i })).toBeVisible();
    });

    test('shows error state when API returns 500', async ({ page }) => {
      await page.route('**/api/vacations**', route => route.fulfill({ status: 500 }));
      await page.reload();
      await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
    });

    test('responsive: tabs visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByRole('tab', { name: /closures/i })).toBeVisible();
    });
  });

  test.describe('when authenticated as staff', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'staff');
      await page.route('**/api/vacations**', route =>
        route.fulfill({ status: 200, json: { success: true, data: [] } })
      );
      await page.goto('/vacations');
    });

    test('staff can see Request Vacation button on vacations tab', async ({ page }) => {
      await page.getByRole('tab', { name: /staff vacations/i }).click();
      await expect(page.getByRole('button', { name: /request vacation/i })).toBeVisible();
    });
  });
});
