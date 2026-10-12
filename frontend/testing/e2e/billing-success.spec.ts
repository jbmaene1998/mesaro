import { test, expect } from '@playwright/test';

// NOTE: /billing/success is a Stripe post-checkout callback page. In production,
// Stripe redirects here with a ?session_id= query param. Tests mock the confirm
// API to avoid a real Stripe dependency.

test.describe('Billing Success Page', () => {
  test('renders success message when session is confirmed', async ({ page }) => {
    await page.route('**/api/billing/checkout/confirm**', route =>
      route.fulfill({ status: 200, json: { success: true, data: null } })
    );
    await page.goto('/billing/success?session_id=mock-session-123');
    await expect(page.getByText(/you're all set|subscription is now active/i)).toBeVisible();
  });

  test('Go to dashboard button navigates to /dashboard', async ({ page }) => {
    await page.route('**/api/billing/checkout/confirm**', route =>
      route.fulfill({ status: 200, json: { success: true, data: null } })
    );
    await page.goto('/billing/success?session_id=mock-session-123');
    await page.getByRole('link', { name: /go to dashboard|dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows error when confirmation API returns 500', async ({ page }) => {
    await page.route('**/api/billing/checkout/confirm**', route => route.fulfill({ status: 500 }));
    await page.goto('/billing/success?session_id=mock-session-123');
    await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
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
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/billing/success?session_id=mock-session-123');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
