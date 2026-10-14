import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

// NOTE: /billing/success is a Stripe post-checkout callback page. In production,
// Stripe redirects here with a ?session_id= query param. Tests mock the confirm
// API to avoid a real Stripe dependency.

test.describe('Billing Success Page', () => {
  test('renders success message when session is confirmed', async ({ page }) => {
    await page.route('**/api/billing/checkout/confirm**', route =>
      route.fulfill({ status: 200, json: { success: true, data: null } })
    );
    await loginAs(page, 'owner');
    await page.goto('/billing/success?session_id=mock-session-123');
    await expect(page.getByRole('heading', { name: /you're all set/i })).toBeVisible();
  });

  test('Go to dashboard button navigates to /dashboard', async ({ page }) => {
    await page.route('**/api/billing/checkout/confirm**', route =>
      route.fulfill({ status: 200, json: { success: true, data: null } })
    );
    await loginAs(page, 'owner');
    await page.goto('/billing/success?session_id=mock-session-123');
    await expect(page.getByRole('heading', { name: /you're all set/i })).toBeVisible({ timeout: 15_000 });
    // Client-side React Router navigation — do not wait for a full document "load".
    await page.locator('a[href="/dashboard"]').first().click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test('shows error when confirmation API returns 500', async ({ page }) => {
    await page.route('**/api/billing/checkout/confirm**', route => route.fulfill({ status: 500 }));
    await loginAs(page, 'owner');
    await page.goto('/billing/success?session_id=mock-session-123');
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('renders gracefully without session_id param', async ({ page }) => {
    await page.goto('/billing/success');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('link', { name: /go to dashboard|dashboard/i })).toBeVisible();
  });

  test('responsive: content visible at 375 × 812', async ({ page }) => {
    await page.route('**/api/billing/checkout/confirm**', route =>
      route.fulfill({ status: 200, json: { success: true, data: null } })
    );
    await loginAs(page, 'owner');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/billing/success?session_id=mock-session-123');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
