import { test, expect } from '@playwright/test';

import { loginAs } from './helpers/auth';

const mockStaff = [
  {
    id: 'u1',
    name: 'Bob Staff',
    email: 'bob@example.com',
    role: 'STAFF',
    lastLogin: '2026-03-01T08:00:00Z',
    status: 'ACTIVE'
  }
];

test.describe('Staff Management Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/login/);
  });

  test('role guard: STAFF user sees access denied', async ({ page }) => {
    await loginAs(page, 'staff');
    await page.goto('/staff');
    await expect(page.getByText(/403|access denied/i)).toBeVisible();
  });

  test.describe('when authenticated as manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
      await page.route('**/api/staff**', route =>
        route.fulfill({ status: 200, json: { success: true, data: mockStaff } })
      );
      await page.goto('/staff');
    });

    test('renders Staff heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /^staff$/i })).toBeVisible();
    });

    test('Invite Staff button is visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: /invite staff/i })).toBeVisible();
    });

    test('renders existing staff member name', async ({ page }) => {
      await expect(page.getByText(/bob staff/i)).toBeVisible();
    });

    test('shows error state when API returns 500', async ({ page }) => {
      await page.route('**/api/staff**', route => route.fulfill({ status: 500 }));
      await page.reload();
      await expect(page.getByText(/something went wrong|error|failed/i)).toBeVisible();
    });

    test('responsive: staff list visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByRole('heading', { name: /^staff$/i })).toBeVisible();
    });
  });
});
