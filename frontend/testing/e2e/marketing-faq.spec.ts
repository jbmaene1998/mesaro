import { test, expect } from '@playwright/test';

test.describe('FAQ Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/faq');
  });

  test('renders FAQ heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /common questions|faq/i })).toBeVisible();
  });

  test('accordion items expand on click', async ({ page }) => {
    const trigger = page.locator('button[aria-expanded]').first();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  test('try it free CTA link navigates to /register', async ({ page }) => {
    await page.getByRole('link', { name: /try it free|start now/i }).first().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('responsive: heading and first accordion visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('button[aria-expanded]').first()).toBeVisible();
  });
});
