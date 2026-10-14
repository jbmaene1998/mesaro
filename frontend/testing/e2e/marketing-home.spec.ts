import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders primary heading', { tag: '@smoke' }, async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Start Now link navigates to /register', async ({ page }) => {
    await page.getByRole('link', { name: /start now/i }).first().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('See how it works link navigates to /features', async ({ page }) => {
    await page.getByRole('link', { name: /see how it works/i }).first().click();
    await expect(page).toHaveURL(/\/features/);
  });

  test('Request Demo link navigates to /contact', async ({ page }) => {
    await page.getByRole('link', { name: /request a demo/i }).click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test('FAQ accordion expands an item', async ({ page }) => {
    const triggers = page.locator('button[aria-expanded]:visible');
    const second = triggers.nth(1);
    await second.click();
    await expect(second).toHaveAttribute('aria-expanded', 'true');
  });

  test('responsive: heading visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
