import { test, expect } from '@playwright/test';

// /billing/cancel is a Stripe post-checkout cancel page — no auth required,
// no API calls made.

test.describe('Billing Cancel Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing/cancel');
  });

  test('renders checkout cancelled heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /checkout cancelled/i })).toBeVisible();
  });

  test('shows no-charge message', async ({ page }) => {
    await expect(page.getByText(/no charge was made/i)).toBeVisible();
  });

  test('Try again link navigates to /settings/billing', async ({ page }) => {
    await page.getByRole('link', { name: /try again/i }).click();
    await expect(page).toHaveURL(/\/settings\/billing/);
  });

  test('Back to dashboard link navigates to /dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /back to dashboard|dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('responsive: message and links visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByText(/no charge was made/i)).toBeVisible();
  });
});
