import { test, expect } from '@playwright/test';

import { loginAsOwnerWithoutRestaurants } from './helpers/auth';

test.describe('Go-live onboarding wizard', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('when authenticated without restaurants', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwnerWithoutRestaurants(page);
      await expect(
        page.getByRole('heading', { name: /go live with mesaro|ga live met mesaro|sal en vivo|passez en ligne/i })
      ).toBeVisible({ timeout: 15_000 });
    });

    test('renders go-live wizard heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /go live with mesaro|ga live met mesaro|sal en vivo|passez en ligne/i })
      ).toBeVisible();
    });

    test('restaurant name and slug fields are visible', async ({ page }) => {
      await expect(page.getByLabel(/restaurant name/i)).toBeVisible();
      await expect(page.getByLabel(/booking url slug/i)).toBeVisible();
    });

    test('slug preview updates as name is typed', async ({ page }) => {
      await page.getByLabel(/restaurant name/i).fill('My Test Restaurant');
      await expect(page.getByText(/\/r\/my-test-restaurant/i)).toBeVisible();
    });

    test('successful restaurant create advances wizard', async ({ page }) => {
      await page.route('**/api/restaurants', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            json: {
              success: true,
              data: {
                id: 'r-new',
                name: 'My Test Restaurant',
                slug: 'my-test-restaurant',
                timezone: 'Europe/Brussels',
                locale: 'en',
                bookingEnabled: false,
                slotIntervalMinutes: 15,
                defaultDurationMinutes: 90,
                minNoticeMinutes: 0,
                maxAdvanceDays: 90,
                maxPartySize: 20,
                assignmentMode: 'AUTO',
                billingStatus: 'TRIALING',
                trialEndsAt: null
              }
            }
          });
          return;
        }
        await route.fallback();
      });
      await page.getByLabel(/restaurant name/i).fill('My Test Restaurant');
      await page.getByRole('button', { name: /create restaurant/i }).click();
      await expect(page).toHaveURL(/\/onboarding\?step=/);
    });

    test('shows error when create API returns 500', async ({ page }) => {
      await page.route('**/api/restaurants', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({ status: 500 });
          return;
        }
        await route.fallback();
      });
      await page.getByLabel(/restaurant name/i).fill('My Test Restaurant');
      await page.getByRole('button', { name: /create restaurant/i }).click();
      await expect(page.getByText(/couldn't create|error|failed|try again/i).first()).toBeVisible();
    });

    test('responsive: form visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByRole('button', { name: /create restaurant/i })).toBeVisible();
    });
  });
});
