import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

test("Staff can create a walk-in reservation", async ({ page }) => {
  await loginAs(page, "staff");

  await page.getByRole("button", { name: "New Walk-in" }).click();

  await page.getByLabel("Party Size").fill("4");
  await page.getByLabel("Guest Name (optional)").fill("E2E Walkin Guest");

  const firstTableCheckbox = page.locator("input[type='checkbox']").first();
  await firstTableCheckbox.check();

  await page.getByRole("button", { name: "Seat Walk-in" }).click();

  await expect(page.getByText(/Walk-in seated at Table/i)).toBeVisible();

  await page.goto("/reservations");
  await expect(page.getByText("E2E Walkin Guest")).toBeVisible();
});
