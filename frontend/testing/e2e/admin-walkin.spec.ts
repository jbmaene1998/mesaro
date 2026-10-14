import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

test("Staff can create a walk-in reservation", async ({ page }) => {
  await loginAs(page, "staff");

  await page.getByRole("button", { name: "New Walk-in" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("spinbutton", { name: "Party Size" }).fill("4");
  await dialog.getByLabel("Guest Name (optional)").fill("E2E Walkin Guest");

  // Default 90 min may not fit near Dinner end (22:00). UI offers 60/90/120.
  await dialog.locator("#walkin-duration").click();
  await page.getByRole("option", { name: "60 min" }).click();

  // Tables are selectable buttons (best-fit auto-selects). Wait until one is available.
  await expect(dialog.getByRole("button", { name: /seats|available|best/i }).first()).toBeVisible({
    timeout: 15_000
  });

  const createWait = page.waitForResponse(
    (res) =>
      res.url().includes("/admin/reservations") &&
      res.request().method() === "POST"
  );
  await dialog.getByRole("button", { name: "Seat Walk-in" }).click();
  const createRes = await createWait;
  expect(createRes.ok(), await createRes.text()).toBeTruthy();

  await page.goto("/reservations");
  await expect(page.getByText("E2E Walkin Guest")).toBeVisible({ timeout: 15_000 });
});
