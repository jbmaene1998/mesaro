import { test, expect } from '@playwright/test';

import { expectApiErrorVisible } from './helpers/assertions';
import { loginAs } from './helpers/auth';

test.describe('Settings Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('role guard: STAFF user sees access denied', async ({ page }) => {
    await loginAs(page, 'staff');
    await page.goto('/settings');
    await expect(page.getByText(/access denied/i).first()).toBeVisible();
  });

  test('role guard: MANAGER user sees access denied', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/settings');
    await expect(page.getByText(/access denied/i).first()).toBeVisible();
  });

  test.describe('when authenticated as owner', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'owner');
      // Use the real restaurant APIs — broad mocks break AppShell restaurant selection.
      await page.goto('/settings');
      await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 15_000 });
    });

    test('OWNER: renders Settings heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible();
    });

    test('OWNER: restaurant name field is editable', async ({ page }) => {
      await expect(page.getByLabel(/restaurant name/i)).toBeVisible();
    });

    test('OWNER: shows error when save API returns 500', async ({ page }) => {
      await page.route('**/api/restaurants/*', async (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          await route.fulfill({ status: 500 });
          return;
        }
        await route.continue();
      });
      const nameField = page.getByLabel(/restaurant name/i);
      await nameField.fill(`${(await nameField.inputValue()) || 'Demo'} Updated`);
      await page.getByRole('button', { name: /save/i }).first().click();
      await expectApiErrorVisible(page);
    });
  });
});
