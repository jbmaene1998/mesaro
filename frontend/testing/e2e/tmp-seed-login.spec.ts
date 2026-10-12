import { test, expect } from '@playwright/test';

test('seed admin can login', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('admin@demo.com');
  await page.locator('#password').fill('demo123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});