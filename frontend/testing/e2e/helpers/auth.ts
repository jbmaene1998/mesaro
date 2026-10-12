import { expect, Page, test } from "@playwright/test";

type Role = "staff" | "manager" | "owner";

function credentialsFor(role: Role) {
  if (role === "owner") {
    return {
      email: process.env.E2E_OWNER_EMAIL,
      password: process.env.E2E_OWNER_PASSWORD
    };
  }

  if (role === "manager") {
    return {
      email: process.env.E2E_MANAGER_EMAIL,
      password: process.env.E2E_MANAGER_PASSWORD
    };
  }

  return {
    email: process.env.E2E_STAFF_EMAIL,
    password: process.env.E2E_STAFF_PASSWORD
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
