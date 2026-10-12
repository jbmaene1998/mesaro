import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

test("Manager can manage reservation lifecycle", async ({ page }) => {
  await loginAs(page, "manager");
  await page.goto("/reservations");

  const confirmedRow = page.locator("tr", { hasText: "CONFIRMED" }).first();
  await expect(confirmedRow).toBeVisible();

  await confirmedRow.getByRole("button", { name: "Reservation actions" }).click();
  await page.getByRole("menuitem", { name: "Seat Guest" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText(/marked as seated/i)).toBeVisible();
  await expect(page.locator("tr", { hasText: "SEATED" }).first()).toBeVisible();

  const seatedRow = page.locator("tr", { hasText: "SEATED" }).first();
  await seatedRow.getByRole("button", { name: "Reservation actions" }).click();
  await page.getByRole("menuitem", { name: "Mark Completed" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText(/marked as completed/i)).toBeVisible();
  await expect(page.locator("tr", { hasText: "COMPLETED" }).first()).toBeVisible();
});
