import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

test("Staff cannot see management pages", async ({ page }) => {
  await loginAs(page, "staff");

  await expect(page.getByRole("link", { name: "Tables" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Shifts" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Staff" })).toHaveCount(0);

  await page.goto("/tables");
  await expect(page.getByText(/access denied/i).first()).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByText(/access denied/i).first()).toBeVisible();
});
