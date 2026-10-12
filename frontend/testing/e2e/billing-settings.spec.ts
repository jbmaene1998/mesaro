import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

test.describe('Billing Settings Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/settings/billing');
    await expect(page).toHaveURL(/\/login/);
  });

  test('role guard: STAFF user sees access denied', async ({ page }) => {
    await loginAs(page, 'staff');
    await page.goto('/settings/billing');
    await expect(page.getByText(/403|access denied/i)).toBeVisible();
  });

  test('role guard: MANAGER user sees access denied', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/settings/billing');
    await expect(page.getByText(/403|access denied/i)).toBeVisible();
  });

  test.describe('when authenticated as owner', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'owner');
      await page.route('**/api/billing/status**', route =>
        route.fulfill({
          status: 200,
          json: { success: true, data: { status: 'trialing', trialEndsAt: '2026-03-17' } }
        })
      );
      await page.goto('/settings/billing');
    });

    test('OWNER: renders Billing heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible();
    });

    test('OWNER: shows Subscribe button when on trial', async ({ page }) => {
      await expect(page.getByRole('button', { name: /subscribe now/i })).toBeVisible();
    });

    test('OWNER: shows error when billing API returns 500', async ({ page }) => {
      await page.route('**/api/billing/status**', route => route.fulfill({ status: 500 }));
      await page.goto('/settings/billing');
      await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
    });
  });
});
