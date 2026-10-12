import { describe, expect, it } from "vitest";

import { resolvePostLoginRedirect } from "@/features/auth/redirect";

describe("resolvePostLoginRedirect", () => {
  it("falls back to dashboard for missing or unsafe values", () => {
    expect(resolvePostLoginRedirect(null)).toBe("/dashboard");
    expect(resolvePostLoginRedirect("")).toBe("/dashboard");
    expect(resolvePostLoginRedirect("https://evil.example")).toBe("/dashboard");
    expect(resolvePostLoginRedirect("//evil.example")).toBe("/dashboard");
    expect(resolvePostLoginRedirect("/login?returnUrl=%2Fdashboard")).toBe("/dashboard");
  });

  it("returns valid internal paths", () => {
    expect(resolvePostLoginRedirect("/dashboard")).toBe("/dashboard");
    expect(resolvePostLoginRedirect("/reservations?date=2026-02-15")).toBe("/reservations?date=2026-02-15");
  });
});
