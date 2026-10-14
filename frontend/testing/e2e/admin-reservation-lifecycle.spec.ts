import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

test("Manager can manage reservation lifecycle", async ({ page }) => {
  await loginAs(page, "manager");
  await page.goto("/reservations");

  // Create a seatable CONFIRMED reservation for today (manual dialog uses
  // checkboxes + best-fit auto-select — not walk-in-style table buttons).
  await page.getByRole("button", { name: "New Reservation" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Guest Name").fill("E2E Lifecycle Guest");
  await expect(dialog.getByRole("button", { name: "Create Reservation" })).toBeEnabled({
    timeout: 20_000
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
