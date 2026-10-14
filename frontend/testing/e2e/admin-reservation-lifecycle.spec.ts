import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

test("Manager can manage reservation lifecycle", async ({ page }) => {
  await loginAs(page, "manager");
  await page.goto("/reservations");

  // Seed bulk packs Lunch 11:45/12:30 and Dinner 18:00/19:15 — use Dinner @ 20:00
  // so a free table exists and Create stays enabled.
  await page.getByRole("button", { name: "New Reservation" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.locator("#manual-shift").click();
  await page.getByRole("option", { name: /Dinner/i }).click();
  await dialog.locator("#manual-reservation-time").fill("20:00");
  await dialog.getByLabel("Guest Name").fill("E2E Lifecycle Guest");

  const tableCheckbox = dialog.locator('input[type="checkbox"]').first();
  await expect(tableCheckbox).toBeVisible({ timeout: 20_000 });
  if (!(await tableCheckbox.isChecked())) {
    await tableCheckbox.check();
  }

  await expect(dialog.getByRole("button", { name: "Create Reservation" })).toBeEnabled({
    timeout: 10_000
  });
  await dialog.getByRole("button", { name: "Create Reservation" }).click();
  await expect(page.getByText(/E2E Lifecycle Guest/i).first()).toBeVisible({ timeout: 15_000 });

  const row = page.locator("tbody tr").filter({ hasText: "E2E Lifecycle Guest" }).first();
  await expect(row).toBeVisible();
  await expect(row.getByText("CONFIRMED")).toBeVisible();

  await row.getByRole("button", { name: "Reservation actions" }).click();
  await page.getByRole("menuitem", { name: "Seat Guest" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText(/marked as seated/i).first()).toBeVisible();
  await expect(row.getByText("SEATED")).toBeVisible();

  await row.getByRole("button", { name: "Reservation actions" }).click();
  await page.getByRole("menuitem", { name: "Mark Completed" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText(/marked as completed/i).first()).toBeVisible();
  await expect(
    page.locator("tbody tr").filter({ hasText: "E2E Lifecycle Guest" }).getByText("COMPLETED")
  ).toBeVisible();
});
