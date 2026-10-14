import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

const mockUser = {
  id: '1',
  fullName: 'Jane Manager',
  email: 'manager@example.com',
  phone: '+32 470 000 000',
  restaurants: [] as { restaurantId: string; role: string }[]
};

test.describe('Account Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('when authenticated as manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
      await page.route('**/api/auth/current-user**', route =>
        route.fulfill({ status: 200, json: { success: true, data: mockUser } })
      );
      await page.goto('/account');
    });

    test('renders My Account heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /my account/i })).toBeVisible();
    });

    test('profile form fields are visible', async ({ page }) => {
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/full name|your name/i)).toBeVisible();
    });

    test('saves profile successfully', async ({ page }) => {
      await page.getByLabel(/full name|your name/i).fill('Jane Updated');
      await page.getByRole('button', { name: /save profile/i }).click();
      await expect(page.getByText(/saved|updated|success/i)).toBeVisible();
    });

    test('shows error when profile update API returns 500', async ({ page }) => {
      await page.route('**/api/auth/current-user**', route => {
        if (route.request().method() === 'PUT') {
          return route.fulfill({ status: 500 });
        }
        return route.fulfill({ status: 200, json: { success: true, data: mockUser } });
      });
      await page.getByLabel(/full name|your name/i).fill('Jane Updated');
      await page.getByRole('button', { name: /save profile/i }).click();
      await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
    });

    test('shows password mismatch error', async ({ page }) => {
      await page.getByLabel('Current password', { exact: true }).fill('oldpass123');
      await page.getByLabel('New password', { exact: true }).fill('newpass456');
      await page.getByLabel('Confirm new password', { exact: true }).fill('different789');
      await page.getByRole('button', { name: /change password/i }).click();
      await expect(page.getByText(/do not match|passwords must match/i)).toBeVisible();
    });

    test('responsive: form visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByRole('heading', { name: /my account/i })).toBeVisible();
    });
  });
});
