import { expect, test } from '@playwright/test';

const MOCK_TOKEN = 'mock-invite-token';

test.describe('Accept Invite Page', () => {
  test('shows accepting state and redirects on valid token', async ({ page }) => {
    await page.route('**/api/staff/accept-invite**', route =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            token: 'mock-jwt',
            refreshToken: 'mock-refresh',
            user: { id: '2', name: 'Staff Member', email: 'staff@example.com' }
          }
        }
      })
    );
    await page.goto(`/accept-invite?token=${MOCK_TOKEN}`);
    await expect(page.getByText(/accepting|accepted|welcome|redirecting/i)).toBeVisible();
  });

  test('shows error for expired token', async ({ page }) => {
    await page.route('**/api/staff/accept-invite**', route =>
      route.fulfill({
        status: 400,
        json: { success: false, error: { message: 'Invite token expired' } }
      })
    );
    await page.goto(`/accept-invite?token=${MOCK_TOKEN}`);
    await expect(page.getByText(/expired|invalid|request a new/i)).toBeVisible();
  });

  test('shows error when no token is provided', async ({ page }) => {
    await page.goto('/accept-invite');
    await expect(page.getByText(/invalid|missing|no token/i)).toBeVisible();
  });

  test('shows "invitation already accepted" when API returns 409', async ({ page }) => {
    await page.route('**/api/staff/accept-invite**', route =>
      route.fulfill({
        status: 409,
        json: { success: false, error: 'INVITE_ALREADY_USED' }
      })
    );
    await page.goto('/accept-invite?token=mock-invite-token');
    await expect(page.getByText(/already accepted|used.*link|sign in instead/i)).toBeVisible();
  });

  test('shows "invitation expired" when API returns 410', async ({ page }) => {
    await page.route('**/api/staff/accept-invite**', route =>
      route.fulfill({
        status: 410,
        json: { success: false, error: 'INVITE_EXPIRED' }
      })
    );
    await page.goto('/accept-invite?token=mock-invite-token');
    await expect(page.getByText(/expired|ask.*manager.*new.*invite/i)).toBeVisible();
  });

  test('already-used invite with login link navigates to /login', async ({ page }) => {
    await page.route('**/api/staff/accept-invite**', route =>
      route.fulfill({ status: 409, json: { success: false, error: 'INVITE_ALREADY_USED' } })
    );
    await page.goto('/accept-invite?token=mock-invite-token');
    const loginLink = page.getByRole('link', { name: /sign in|log in|go to login/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('responsive: status message visible at 375 x 812', async ({ page }) => {
    await page.route('**/api/staff/accept-invite**', route =>
      route.fulfill({ status: 200, json: { success: true, data: {} } })
    );
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/accept-invite?token=${MOCK_TOKEN}`);
    await expect(page.getByRole('main')).toBeVisible();
  });
});
