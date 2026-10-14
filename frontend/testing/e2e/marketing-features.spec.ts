import { test, expect } from '@playwright/test';

test.describe('Features Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/features');
  });

  test('renders primary heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Start Now link navigates to /register', async ({ page }) => {
    await page.getByRole('link', { name: /start now/i }).first().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('feature sections are on the page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /double bookings don't happen here/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /your website\. your widget/i })).toBeVisible();
  });

  test('responsive: heading visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
