import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('renders primary heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('CTA link navigates away from /about', async ({ page }) => {
    await page.getByRole('link', { name: /try mesaro|start now|get started/i }).first().click();
    await expect(page).not.toHaveURL(/\/about/);
  });

  test('value proposition content is visible', async ({ page }) => {
    // At least one section heading or descriptive content should be visible
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
  });

  test('responsive: heading visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
