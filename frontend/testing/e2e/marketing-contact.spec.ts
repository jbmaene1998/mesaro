import { test, expect } from '@playwright/test';

test.describe('Contact Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('renders Talk to us heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /talk to us/i })).toBeVisible();
  });

  test('shows required field errors when form submitted empty', async ({ page }) => {
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('submits form successfully and shows confirmation', async ({ page }) => {
    await page.getByLabel(/first name/i).fill('Jane');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/work email/i).fill('jane@example.com');
    await page.getByLabel(/message/i).fill('This is a long enough test message for the contact form.');
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByText(/sent|thank you|message received/i)).toBeVisible();
  });

  test('shows error message when API returns 500', async ({ page }) => {
    await page.route('**/api/contact**', route => route.fulfill({ status: 500 }));
    await page.getByLabel(/first name/i).fill('Jane');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/work email/i).fill('jane@example.com');
    await page.getByLabel(/message/i).fill('This is a long enough test message for the contact form.');
    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page.getByText(/something went wrong|error|failed|try again/i)).toBeVisible();
  });

  test('responsive: form and submit button visible at 375 × 812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('button', { name: /send message/i })).toBeVisible();
  });
});
