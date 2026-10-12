import { test, expect } from '@playwright/test';

// NOTE: A valid reset token must be in the URL for this page to show the form.
// Tests navigate to /reset-password?token=mock-token and mock the API to avoid
// a real token dependency. The "invalid token" path is tested separately.

test.describe('Reset Password Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reset-password?token=mock-token');
  });

  test('renders Reset Password heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
  });

  test('new password and confirm password inputs are visible', async ({ page }) => {
    await expect(page.getByLabel(/new password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test('shows validation error when passwords do not match', async ({ page }) => {
    await page.getByLabel(/new password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('different456');
    await page.getByRole('button', { name: /update password/i }).click();
    await expect(page.getByText(/do not match|passwords must match/i)).toBeVisible();
  });

  test('successful reset shows success message', async ({ page }) => {
    await page.route('**/api/auth/reset-password**', route =>
      route.fulfill({ status: 200, json: { success: true } })
    );
    await page.getByLabel(/new password/i).fill('newpassword123');
    await page.getByLabel(/confirm password/i).fill('newpassword123');
    await page.getByRole('button', { name: /update password/i }).click();
    await expect(page.getByText(/password updated|success|redirecting/i)).toBeVisible();
  });

  test('shows error when token is invalid or expired', async ({ page }) => {
    await page.route('**/api/auth/reset-password**', route =>
      route.fulfill({ status: 400, json: { success: false, error: { message: 'Token expired' } } })
    );
    await page.getByLabel(/new password/i).fill('newpassword123');
    await page.getByLabel(/confirm password/i).fill('newpassword123');
    await page.getByRole('button', { name: /update password/i }).click();
    await expect(page.getByText(/expired|invalid|request a new/i)).toBeVisible();
  });

  test('shows "token already used" message when API returns 409', async ({ page }) => {
    await page.route('**/api/auth/reset-password**', route =>
      route.fulfill({
        status: 409,
        json: { success: false, error: 'TOKEN_ALREADY_USED' }
      })
    );
    await page.goto('/reset-password?token=mock-token');
    await page.getByLabel(/new password/i).fill('ValidPass1!');
    await page.getByLabel(/confirm password/i).fill('ValidPass1!');
    await page.getByRole('button', { name: /update|reset/i }).click();
    await expect(page.getByText(/already used|link.*used|try again/i)).toBeVisible();
  });

  test('shows "link expired" message when API returns 410', async ({ page }) => {
    await page.route('**/api/auth/reset-password**', route =>
      route.fulfill({
        status: 410,
        json: { success: false, error: 'TOKEN_EXPIRED' }
      })
    );
    await page.goto('/reset-password?token=mock-token');
    await page.getByLabel(/new password/i).fill('ValidPass1!');
    await page.getByLabel(/confirm password/i).fill('ValidPass1!');
    await page.getByRole('button', { name: /update|reset/i }).click();
    await expect(page.getByText(/expired|invalid.*link|request.*new/i)).toBeVisible();
  });

  test('missing token in URL shows error without making an API call', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/auth/reset-password**', route => {
      apiCalled = true;
      return route.fulfill({ status: 200, json: { success: true } });
    });
    await page.goto('/reset-password');
    await expect(page.getByText(/invalid|missing.*token|link.*invalid/i)).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test('responsive: form visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('button', { name: /update password/i })).toBeVisible();
  });
});
