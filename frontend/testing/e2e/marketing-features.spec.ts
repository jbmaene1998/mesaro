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

  test('feature tabs switch content', async ({ page }) => {
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();
    const secondTab = tabs.nth(1);
    await secondTab.click();
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
  });

  test('responsive: heading visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
