import { expect, test } from "@playwright/test";

import { e2eRestaurantSlug, localDatePlusDays } from "./helpers/auth";

test("Guest can book a reservation", { tag: "@smoke" }, async ({ page }) => {
  const remote = Boolean(process.env.PLAYWRIGHT_BASE_URL?.trim());
  const configuredSlug = process.env.E2E_RESTAURANT_SLUG?.trim();
  // Remote staging must not fall back to the local demo slug.
  test.skip(remote && !configuredSlug, "Missing E2E_RESTAURANT_SLUG for remote smoke");

  const slug = e2eRestaurantSlug();
  await page.goto(`/r/${slug}`);

  // Prefer tomorrow so we are past min-notice and still inside advance window.
  await page.getByLabel("Date").fill(localDatePlusDays(1));

  const partySizeTrigger = page.getByRole("combobox");
  await partySizeTrigger.click();
  await page.getByRole("option", { name: "2", exact: true }).click();

  await page.getByRole("button", { name: "Check Availability" }).click();

  await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
  const availableSlot = page.getByRole("button", { name: /available/i }).first();
  await expect(availableSlot).toBeVisible();

  await availableSlot.click();

  await expect(page.getByText("Hold Timer:", { exact: false })).toBeVisible();
  const timerValue = page.getByText(/\d{2}:\d{2}/).first();
  const firstValue = await timerValue.textContent();
  await page.waitForTimeout(1500);
  const secondValue = await timerValue.textContent();
  expect(secondValue).not.toBe(firstValue);

  await page.getByLabel("Name").fill("E2E Guest");
  await page.getByLabel("Email").fill("e2e.guest@example.com");

  await page.getByRole("button", { name: "Confirm Reservation" }).click();

  await expect(page.getByText("Reservation Confirmed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to Calendar" })).toBeVisible();
});
