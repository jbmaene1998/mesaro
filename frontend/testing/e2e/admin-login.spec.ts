import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

test("Staff can log in and view dashboard", async ({ page }) => {
  await loginAs(page, "staff");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Total Reservations")).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
});
