import { expect, test } from "@playwright/test";

test("Guest can cancel their reservation", async ({ page }) => {
  await page.goto("/r/test-restaurant/reservation/RES-TEST-001?cancelToken=xxx");

  await expect(page.getByText("Cancel Reservation")).toBeVisible();
  await expect(page.getByText("RES-TEST-001")).toBeVisible();

  await page.getByRole("button", { name: "Cancel Reservation" }).click();
  await page.getByRole("button", { name: "Confirm Cancellation" }).click();

  await expect(page.getByText(/Reservation cancelled successfully/i)).toBeVisible();
  await expect(page.getByText(/This reservation has been cancelled/i)).toBeVisible();
});
