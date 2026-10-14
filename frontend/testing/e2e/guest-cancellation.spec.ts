import { expect, test } from "@playwright/test";

test("Guest can cancel their reservation", async ({ page }) => {
  await page.route("**/api/reservations/RES-TEST-001**", async (route) => {
    const cancelled = route.request().url().includes("/cancel");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        success: true,
        data: {
          confirmationCode: "RES-TEST-001",
          status: cancelled ? "CANCELLED" : "CONFIRMED",
          date: "2026-04-01",
          time: "19:00",
          partySize: 2,
          timezone: "Europe/Brussels",
          shiftName: "Dinner",
          tableLabels: []
        }
      }
    });
  });

  await page.goto("/r/test-restaurant/reservation/RES-TEST-001?cancelToken=xxx");

  await expect(page.getByText("Cancel Reservation")).toBeVisible();
  await expect(page.getByText("RES-TEST-001")).toBeVisible();

  await page.getByRole("button", { name: "Cancel Reservation" }).click();
  await page.getByRole("button", { name: "Confirm Cancellation" }).click();

  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 5_000 }).catch(async () => {
      await page.getByRole("button", { name: /keep reservation|close/i }).click().catch(() => undefined);
    });
  }

  await expect(page.getByText(/Reservation cancelled successfully/i).first()).toBeVisible();
  await expect(page.getByText(/This reservation has been cancelled/i).first()).toBeVisible();
});
