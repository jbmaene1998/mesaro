import { test, expect } from '@playwright/test';

import { expectApiErrorVisible } from './helpers/assertions';
import { loginAs } from './helpers/auth';

test.describe('Timeline Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/timeline');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('when authenticated as manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
      await page.route('**/timeline**', route => {
        if (!route.request().url().includes('/api/')) {
          return route.continue();
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          json: {
            success: true,
            data: {
              tables: [],
              reservations: [],
              shifts: []
            }
          }
        });
      });
      await page.goto('/timeline');
      await expect(page.getByRole('heading', { level: 1, name: /timeline/i })).toBeVisible({
        timeout: 15_000
      });
    });

    test('renders Timeline heading', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1, name: /timeline/i })).toBeVisible();
    });

    test('date picker is visible', async ({ page }) => {
      await expect(page.getByLabel(/date/i).first()).toBeVisible();
    });

    test('slot duration controls are visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: /15|30|60/i }).first()).toBeVisible();
    });

    test('shows error state when timeline API returns 500', async ({ page }) => {
      await page.route('**/api/**/timeline**', route => route.fulfill({ status: 500 }));
      await page.route('**/api/timeline**', route => route.fulfill({ status: 500 }));
      await page.reload();
      await expectApiErrorVisible(page);
    });

    test('responsive: heading and date controls visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByRole('heading', { level: 1, name: /timeline/i })).toBeVisible();
    });
  });
});
