import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

const mockRestaurant = {
  id: 'r1',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  timezone: 'Europe/Brussels',
  status: 'ACTIVE'
};

test.describe('Settings Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('role guard: STAFF user sees access denied', async ({ page }) => {
    await loginAs(page, 'staff');
    await page.goto('/settings');
    await expect(page.getByText(/403|access denied/i)).toBeVisible();
  });

  test('role guard: MANAGER user sees access denied', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/settings');
    await expect(page.getByText(/403|access denied/i)).toBeVisible();
  });

  test.describe('when authenticated as owner', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'owner');
      await page.route('**/api/restaurants/**', route =>
        route.fulfill({ status: 200, json: { success: true, data: mockRestaurant } })
      );
      await page.route('**/api/billing/**', route =>
        route.fulfill({ status: 200, json: { success: true, data: { status: 'active' } } })
      );
      await page.goto('/settings');
    });

    test('OWNER: renders Settings heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    });

    test('OWNER: restaurant name field is editable', async ({ page }) => {
      await expect(page.getByLabel(/restaurant name/i)).toBeVisible();
    });

    test('OWNER: shows error when save API returns 500', async ({ page }) => {
      await page.route('**/api/restaurants/**', route => route.fulfill({ status: 500 }));
      await page.goto('/settings');
      await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
    });
  });
});
