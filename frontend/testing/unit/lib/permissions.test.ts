import { describe, expect, it } from "vitest";

import { hasPermission, PERMISSIONS } from "@/lib/permissions";

describe("permissions", () => {
  it("OWNER has all permissions", () => {
    Object.keys(PERMISSIONS).forEach((permission) => {
      expect(hasPermission("OWNER", permission as keyof typeof PERMISSIONS)).toBe(true);
    });
  });

  it("MANAGER cannot manage settings or invite owners", () => {
    expect(hasPermission("MANAGER", "manageSettings")).toBe(false);
    expect(hasPermission("MANAGER", "inviteManager")).toBe(false);
  });

  it("STAFF can cancel reservations but cannot manage tables", () => {
    expect(hasPermission("STAFF", "cancelReservation")).toBe(true);
    expect(hasPermission("STAFF", "manageTables")).toBe(false);
  });
});
