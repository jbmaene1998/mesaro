import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

test("Manager can manage reservation lifecycle", async ({ page }) => {
  await loginAs(page, "manager");
  await page.goto("/reservations");

  // statusLabel() renders title case ("Confirmed"), not the enum token.
  const row = page.locator("tbody tr").filter({ hasText: "Confirmed" }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });

  await row.getByRole("button", { name: "Reservation actions" }).click();
  await page.getByRole("menuitem", { name: "Seat Guest" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText(/marked as seated/i).first()).toBeVisible();
  await expect(page.locator("tbody tr").filter({ hasText: "Seated" }).first()).toBeVisible();

  const seatedRow = page.locator("tbody tr").filter({ hasText: "Seated" }).first();
  await seatedRow.getByRole("button", { name: "Reservation actions" }).click();
  await page.getByRole("menuitem", { name: "Mark Completed" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText(/marked as completed/i).first()).toBeVisible();
  await expect(page.locator("tbody tr").filter({ hasText: "Completed" }).first()).toBeVisible();
});
