import { expect, test } from '@playwright/test';

const MOCK_TOKEN = 'mock-invite-token';

function mockPreview(
  page: import('@playwright/test').Page,
  overrides: Partial<{
    restaurantName: string;
    role: string;
    email: string;
    passwordRequired: boolean;
    expired: boolean;
    alreadyAccepted: boolean;
  }> = {}
) {
  return page.route('**/api/staff/invites/preview**', (route) =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          restaurantName: 'Northside Bistro',
          role: 'STAFF',
          email: 'staff@example.com',
          passwordRequired: true,
          expired: false,
          alreadyAccepted: false,
          ...overrides
        }
      }
    })
  );
}

test.describe('Accept Invite Page', () => {
  test('shows invite preview and accepts with password', async ({ page }) => {
    await mockPreview(page);
    await page.route('**/api/staff/accept-invite**', (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            accessToken: 'mock-jwt',
            refreshToken: 'mock-refresh',
            expiresInSeconds: 3600
          }
        }
      })
    );
    await page.goto(`/accept-invite?token=${MOCK_TOKEN}`);
    await expect(page.getByText(/northside bistro/i)).toBeVisible();
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    await page.getByRole('button', { name: /accept invite/i }).click();
    await expect(page.getByText(/welcome to mesaro/i)).toBeVisible();
  });

  test('shows error for expired token from preview', async ({ page }) => {
    await mockPreview(page, { expired: true });
    await page.goto(`/accept-invite?token=${MOCK_TOKEN}`);
    await expect(page.getByText(/expired|ask your manager/i)).toBeVisible();
  });

  test('shows error when no token is provided', async ({ page }) => {
    await page.goto('/accept-invite');
    await expect(page.getByText(/invalid invite link/i)).toBeVisible();
  });

  test('shows already accepted from preview', async ({ page }) => {
    await mockPreview(page, { alreadyAccepted: true });
    await page.goto(`/accept-invite?token=${MOCK_TOKEN}`);
    await expect(page.getByText(/already been used/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /go to login/i })).toBeVisible();
  });

  test('legacy /invite/accept redirects with token', async ({ page }) => {
    await mockPreview(page);
    await page.goto(`/invite/accept?token=${MOCK_TOKEN}`);
    await expect(page).toHaveURL(new RegExp(`/accept-invite\\?token=${MOCK_TOKEN}`));
  });

  test('responsive: form visible at 375 x 812', async ({ page }) => {
    await mockPreview(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/accept-invite?token=${MOCK_TOKEN}`);
    await expect(page.getByRole('button', { name: /accept invite/i })).toBeVisible();
  });
});
