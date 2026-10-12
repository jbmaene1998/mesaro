import { test, expect } from '@playwright/test';

test.describe('Forgot Password Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('renders Forgot Password heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
  });

  test('email input and submit button are visible', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('shows success message after valid email submission', async ({ page }) => {
    await page.route('**/api/auth/forgot-password**', route =>
      route.fulfill({ status: 200, json: { success: true } })
    );
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/reset link|email sent|if an account/i)).toBeVisible();
  });

  test('back to login link navigates to /login', async ({ page }) => {
    await page.getByRole('link', { name: /back to login|sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('responsive: form visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });
});
