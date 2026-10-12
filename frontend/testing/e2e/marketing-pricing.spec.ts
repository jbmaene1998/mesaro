import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  test('renders pricing heading and price', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/49\.99|per month/i)).toBeVisible();
  });

  test('free trial CTA link navigates to /register', async ({ page }) => {
    await page.getByRole('link', { name: /free trial|start now/i }).first().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('FAQ accordion expands an item', async ({ page }) => {
    const trigger = page.locator('button[aria-expanded]').first();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  test('responsive: price and CTA visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByText(/49\.99|per month/i)).toBeVisible();
  });
});
