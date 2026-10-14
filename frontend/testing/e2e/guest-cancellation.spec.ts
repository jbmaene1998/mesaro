import { expect, test } from "@playwright/test";

test("Guest can cancel their reservation", async ({ page }) => {
  let status = "CONFIRMED";

  await page.route("**/api/reservations/RES-TEST-001**", async (route) => {
    if (route.request().method() !== "GET") {
      status = "CANCELLED";
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        success: true,
        data: {
          confirmationCode: "RES-TEST-001",
          status,
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

  // Success toast unmounts with the cancel section once status flips to CANCELLED.
  await expect(page.getByText(/cancelled successfully|has been cancelled/i).first()).toBeVisible({
    timeout: 15_000
  });
});
