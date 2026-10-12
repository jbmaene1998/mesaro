import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

// /onboarding/setup is a ProtectedRoute (any auth), but in practice only newly
// registered OWNER accounts land here. Tests use manager credentials as a
// stand-in — the page renders for any authenticated user.

test.describe('Onboarding Setup Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/onboarding/setup');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('when authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
      await page.goto('/onboarding/setup');
    });

    test('renders Set up your first restaurant heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /set up your first restaurant/i })
      ).toBeVisible();
    });

    test('restaurant name and slug fields are visible', async ({ page }) => {
      await expect(page.getByLabel(/restaurant name/i)).toBeVisible();
      await expect(page.getByLabel(/booking url|slug/i)).toBeVisible();
    });

    test('slug preview updates as name is typed', async ({ page }) => {
      await page.getByLabel(/restaurant name/i).fill('My Test Restaurant');
      await expect(page.getByText(/\/r\//)).toBeVisible();
    });

    test('successful setup redirects to /dashboard', async ({ page }) => {
      await page.route('**/api/restaurants**', route =>
        route.fulfill({
          status: 200,
          json: {
            success: true,
            data: { id: 'r-new', name: 'My Test Restaurant', slug: 'my-test-restaurant' }
          }
        })
      );
      await page.getByLabel(/restaurant name/i).fill('My Test Restaurant');
      await page.getByLabel(/timezone/i).selectOption('Europe/Brussels');
      await page.getByRole('button', { name: /create restaurant/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('shows error when create API returns 500', async ({ page }) => {
      await page.route('**/api/restaurants**', route => route.fulfill({ status: 500 }));
      await page.getByLabel(/restaurant name/i).fill('My Test Restaurant');
      await page.getByRole('button', { name: /create restaurant/i }).click();
      await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
    });

    test('responsive: form visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByRole('button', { name: /create restaurant/i })).toBeVisible();
    });
  });
});
