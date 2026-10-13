import { expect, Page, test } from "@playwright/test";

type Role = "staff" | "manager" | "owner";

/** Dev-seed defaults when E2E_* secrets are unset (ephemeral CI / local). */
const SEED_DEFAULTS: Record<Role, { email: string; password: string }> = {
  owner: { email: "admin@demo.com", password: "demo123" },
  manager: { email: "manager.demo@demo.com", password: "demo123" },
  staff: { email: "staff.demo@demo.com", password: "demo123" }
};

function allowSeedFallback(): boolean {
  // Remote targets (staging smoke) must use Environment secrets — never demo seed.
  return !process.env.PLAYWRIGHT_BASE_URL?.trim();
}

function credentialsFor(role: Role) {
  const seed = allowSeedFallback() ? SEED_DEFAULTS[role] : { email: undefined, password: undefined };

  if (role === "owner") {
    return {
      email: process.env.E2E_OWNER_EMAIL || seed.email,
      password: process.env.E2E_OWNER_PASSWORD || seed.password
    };
  }

  if (role === "manager") {
    return {
      email: process.env.E2E_MANAGER_EMAIL || seed.email,
      password: process.env.E2E_MANAGER_PASSWORD || seed.password
    };
  }

  return {
    email: process.env.E2E_STAFF_EMAIL || seed.email,
    password: process.env.E2E_STAFF_PASSWORD || seed.password
  };
}

export async function loginAs(page: Page, role: Role) {
  const creds = credentialsFor(role);
  test.skip(!creds.email || !creds.password, `Missing E2E credentials for ${role}`);

  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email!);
  await page.getByLabel("Password").fill(creds.password!);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Restaurant slug for guest booking (dev seed: demo-restaurant). */
export function e2eRestaurantSlug(): string {
  return process.env.E2E_RESTAURANT_SLUG?.trim() || "demo-restaurant";
}

/** Local calendar date N days ahead (YYYY-MM-DD). */
export function localDatePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
