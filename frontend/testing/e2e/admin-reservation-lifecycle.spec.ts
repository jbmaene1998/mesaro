import { expect, test } from "@playwright/test";

import { loginAs } from "./helpers/auth";

const API_BASE = (process.env.VITE_API_URL || "http://127.0.0.1:8080/api").replace(/\/$/, "");
const RESTAURANT_TZ = "Europe/Brussels";
/** Matches Walk-in UI options (60/90/120) and still fits before Dinner end 22:00. */
const DURATION_MINUTES = 60;
const DINNER_START = 18 * 60;
const DINNER_END = 23 * 60;
const LAST_RESERVATION = 22 * 60;

function decodeJwtPayload(token: string): Record<string, unknown> {
  const segment = token.split(".")[1];
  if (!segment) {
    throw new Error("Invalid JWT");
  }
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<string, unknown>;
}

function brusselsClock(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: RESTAURANT_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

/** Future Dinner slot that respects last_reservation_time and duration-vs-service-end. */
function nextDinnerSlotInBrussels(now = new Date()): { date: string; time: string; endTime: string } | null {
  const { date, minutes: nowMinutes } = brusselsClock(now);
  let start = Math.ceil((nowMinutes + 5) / 15) * 15;
  if (start < DINNER_START) {
    start = DINNER_START;
  }
  if (start > LAST_RESERVATION) {
    // Still allow booking exactly at last_reservation if that moment is still ahead.
    if (nowMinutes < LAST_RESERVATION) {
      start = LAST_RESERVATION;
    } else {
      return null;
    }
  }
  if (start + DURATION_MINUTES > DINNER_END) {
    return null;
  }

  const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
  const endTotal = start + DURATION_MINUTES;
  const endTime = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(endTotal % 60).padStart(2, "0")}`;
  return { date, time, endTime };
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

  const slot = nextDinnerSlotInBrussels();
  test.skip(!slot, "Too late for a 60-minute Dinner booking before 22:00 Europe/Brussels");

  const headers = { Authorization: `Bearer ${accessToken}` };
  const statusRes = await page.request.get(`${API_BASE}/restaurants/${restaurantId}/tables/status`, {
    headers,
    params: { date: slot!.date, startTime: slot!.time, endTime: slot!.endTime }
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
  expect(free, `expected a free table at ${slot!.time}`).toBeTruthy();

  const createRes = await page.request.post(`${API_BASE}/admin/reservations`, {
    headers: { ...headers, "Content-Type": "application/json" },
    params: { restaurantId: String(restaurantId) },
    data: {
      guestName: "E2E Lifecycle Guest",
      partySize: 2,
      date: slot!.date,
      time: slot!.time,
      durationMinutes: DURATION_MINUTES,
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
