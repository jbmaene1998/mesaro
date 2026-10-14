import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

test("Staff can create a walk-in reservation", async ({ page }) => {
  await loginAs(page, "staff");

  await page.getByRole("button", { name: "New Walk-in" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("spinbutton", { name: "Party Size" }).fill("4");
  await dialog.getByLabel("Guest Name (optional)").fill("E2E Walkin Guest");

  // Tables are selectable buttons (best-fit auto-selects). Wait until one is available.
  await expect(dialog.getByRole("button", { name: /seats|available|best/i }).first()).toBeVisible({
    timeout: 15_000
  });

  await dialog.getByRole("button", { name: "Seat Walk-in" }).click();

  await expect(page.getByText(/Walk-in seated at Table/i)).toBeVisible({ timeout: 15_000 });

  await page.goto("/reservations");
  await expect(page.getByText("E2E Walkin Guest")).toBeVisible();
});
