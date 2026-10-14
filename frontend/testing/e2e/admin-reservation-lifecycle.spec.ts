import { expect, test } from "@playwright/test";

import { loginAs, localDatePlusDays } from "./helpers/auth";

const API_BASE = (process.env.VITE_API_URL || "http://127.0.0.1:8080/api").replace(/\/$/, "");

function decodeJwtPayload(token: string): Record<string, unknown> {
  const segment = token.split(".")[1];
  if (!segment) {
    throw new Error("Invalid JWT");
  }
  const json = Buffer.from(segment, "base64url").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

test("Manager can manage reservation lifecycle", async ({ page }) => {
  const loginWait = page.waitForResponse((res) => res.url().includes("/api/auth/login") && res.ok());
  await loginAs(page, "manager");
  const loginBody = (await (await loginWait).json()) as {
    data?: { accessToken?: string };
    accessToken?: string;
  };
  const accessToken = loginBody.data?.accessToken ?? loginBody.accessToken;
  expect(accessToken, "login access token").toBeTruthy();

  const restaurants = decodeJwtPayload(accessToken!).restaurants as
    | Array<{ restaurantId?: number | string; id?: number | string }>
    | undefined;
  const restaurantId = Number(restaurants?.[0]?.restaurantId ?? restaurants?.[0]?.id);
  expect(restaurantId, "manager restaurant id").toBeGreaterThan(0);

  const date = localDatePlusDays(0);
  const headers = { Authorization: `Bearer ${accessToken}` };

  const statusRes = await page.request.get(`${API_BASE}/restaurants/${restaurantId}/tables/status`, {
    headers,
    params: { date, startTime: "20:00", endTime: "21:30" }
  });
  expect(statusRes.ok(), await statusRes.text()).toBeTruthy();
  const statusJson = await statusRes.json();
  const tables = (statusJson.data ?? statusJson) as Array<{
    id: number | string;
    seats?: number;
    available?: boolean;
    status?: string;
  }>;
  const free = tables.find((table) => {
    const available =
      typeof table.available === "boolean"
        ? table.available
        : String(table.status ?? "").toUpperCase() === "AVAILABLE";
    return available && Number(table.seats ?? 0) >= 2;
  });
  expect(free, "expected a free table for Dinner 20:00").toBeTruthy();

  const createRes = await page.request.post(`${API_BASE}/admin/reservations`, {
    headers: { ...headers, "Content-Type": "application/json" },
    params: { restaurantId: String(restaurantId) },
    data: {
      guestName: "E2E Lifecycle Guest",
      partySize: 2,
      date,
      time: "20:00",
      durationMinutes: 90,
      tableIds: [Number(free!.id)],
      seatImmediately: false
    }
  });
  expect(createRes.ok(), await createRes.text()).toBeTruthy();

  await page.goto("/reservations");
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
