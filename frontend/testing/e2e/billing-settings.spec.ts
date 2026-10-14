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
    await expect(page.getByText(/access denied/i).first()).toBeVisible();
  });

  test('role guard: MANAGER user sees access denied', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/settings/billing');
    await expect(page.getByText(/access denied/i).first()).toBeVisible();
  });

  test.describe('when authenticated as owner', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'owner');
      // Real path is /api/restaurants/{id}/billing/status
      await page.route('**/billing/status**', route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          json: {
            success: true,
            data: {
              status: 'TRIALING',
              trialEndsAt: '2026-12-17T00:00:00Z',
              stripeSubscriptionId: null,
              currentQuantity: 1,
              activeRestaurantCount: 1
            }
          }
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
      await page.unroute('**/billing/status**');
      await page.route('**/billing/status**', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: { code: 'INTERNAL', message: 'boom' } })
        })
      );
      await page.goto('/settings/billing');
      await expect(
        page.getByText(/failed to load billing|please refresh|something went wrong|error|failed|select a restaurant/i).first()
      ).toBeVisible({ timeout: 15_000 });
    });
  });
});
