import { test, expect } from '@playwright/test';

import { expectApiErrorVisible } from './helpers/assertions';
import { loginAs } from './helpers/auth';

const mockReservation = {
  id: 'res-001',
  confirmationCode: 'RES-001',
  status: 'CONFIRMED',
  guestName: 'Alice Guest',
  guestEmail: 'alice@example.com',
  guestPhone: '+32 470 111 222',
  partySize: 3,
  date: '2026-03-10',
  startTime: '19:00',
  endTime: '21:00',
  notes: '',
  tables: [{ id: 't1', label: 'Table 1' }],
  shiftName: 'Dinner',
  createdAt: '2026-03-01T10:00:00Z'
};

test.describe('Reservation Detail Page', () => {
  test('auth guard: unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/reservations/res-001');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('when authenticated as manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
      await page.route('**/api/admin/reservations/res-001**', route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          json: { success: true, data: mockReservation }
        })
      );
      await page.goto('/reservations/res-001');
    });

    test('renders confirmation code and CONFIRMED status badge', async ({ page }) => {
      await expect(page.getByText(/RES-001/).first()).toBeVisible();
      await expect(page.getByText(/confirmed/i).first()).toBeVisible();
    });

    test('guest information is displayed', async ({ page }) => {
      await expect(page.getByText(/alice guest/i)).toBeVisible();
      await expect(page.getByText(/alice@example.com/i)).toBeVisible();
    });

    test('back button navigates to /reservations', async ({ page }) => {
      await page.getByRole('link', { name: /back|reservations/i }).first().click();
      await expect(page).toHaveURL(/\/reservations/);
    });

    test('Seat Guest action button is visible for CONFIRMED reservation', async ({ page }) => {
      await expect(page.getByRole('button', { name: /seat guest/i })).toBeVisible();
    });

    test('shows error state when reservation API returns 500', async ({ page }) => {
      await page.route('**/api/admin/reservations/res-001**', route => route.fulfill({ status: 500 }));
      await page.reload();
      await expectApiErrorVisible(page);
    });

    test('responsive: reservation info visible at 375 × 812', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.getByText(/RES-001/).first()).toBeVisible();
    });
  });
});
