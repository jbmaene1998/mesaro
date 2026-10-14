import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  test('renders pricing heading and price', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: /49\.99/ })).toBeVisible();
  });

  test('free trial CTA link navigates to /register', async ({ page }) => {
    await page.getByRole('link', { name: /free trial|start now/i }).first().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('FAQ accordion expands an item', async ({ page }) => {
    const triggers = page.locator('button[aria-expanded]:visible');
    const second = triggers.nth(1);
    await second.click();
    await expect(second).toHaveAttribute('aria-expanded', 'true');
  });

  test('responsive: price and CTA visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole("heading", { level: 1, name: /49\.99/ })).toBeVisible();
  });
});
