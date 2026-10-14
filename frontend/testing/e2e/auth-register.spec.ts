import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('renders Create your account heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('shows validation errors when form submitted empty', async ({ page }) => {
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
  });

  test('link to login navigates to /login', async ({ page }) => {
    await page.getByRole('link', { name: /log in|sign in|already have/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('successful registration asks you to verify your email', async ({ page }) => {
    await page.route('**/api/auth/register**', route => route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { email: 'owner@example.com', verificationRequired: true },
        error: null,
        timestamp: new Date().toISOString()
      })
    }));
    await page.getByLabel(/your name/i).fill('Test Owner');
    await page.getByLabel(/work email/i).fill('owner@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByRole('heading', { name: /verify your account/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/onboarding/);
  });

  test('shows error message when API returns 500', async ({ page }) => {
    await page.route('**/api/auth/register**', route => route.fulfill({ status: 500 }));
    await page.getByLabel(/your name/i).fill('Test Owner');
    await page.getByLabel(/work email/i).fill('owner@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
  });

  test('responsive: form visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });
});
