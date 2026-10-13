import { describe, expect, it } from "vitest";

import { buildRoleWalkthroughSteps } from "@/features/onboarding/roleWalkthroughSteps";
import {
  isStaffFirstRunDone,
  markStaffFirstRunDone,
  shouldShowStaffFirstRun
} from "@/features/onboarding/staffFirstRun";

describe("buildRoleWalkthroughSteps", () => {
  it("gives staff service-focused steps without table management", () => {
    const steps = buildRoleWalkthroughSteps({ role: "STAFF", locale: "en" });
    expect(steps.some((step) => step.href === "/tables")).toBe(false);
    expect(steps.some((step) => step.href === "/shifts")).toBe(false);
    expect(steps.some((step) => step.href === "/planning")).toBe(true);
    expect(steps.some((step) => step.category === "service")).toBe(true);
  });

  it("gives managers detailed tables and shifts steps", () => {
    const steps = buildRoleWalkthroughSteps({ role: "MANAGER", locale: "en" });
    const tableSteps = steps.filter((step) => step.category === "tables");
    const shiftSteps = steps.filter((step) => step.category === "shifts");
    expect(tableSteps.length).toBeGreaterThanOrEqual(3);
    expect(shiftSteps.length).toBeGreaterThanOrEqual(2);
    expect(steps.some((step) => step.id === "mgr-shifts-publish")).toBe(true);
    expect(steps.some((step) => step.id === "owner-settings")).toBe(false);
  });

  it("adds owner settings and optional finish-setup", () => {
    const ready = buildRoleWalkthroughSteps({ role: "OWNER", locale: "en" });
    expect(ready.some((step) => step.id === "owner-settings")).toBe(true);
    expect(ready.some((step) => step.id === "finish-setup")).toBe(false);

    const incomplete = buildRoleWalkthroughSteps({
      role: "OWNER",
      locale: "en",
      onboardingIncomplete: true
    });
    expect(incomplete.some((step) => step.id === "finish-setup")).toBe(true);
  });
});

describe("shouldShowStaffFirstRun", () => {
  const userId = "user-1";
  const restaurantId = "rest-1";

  it("supports OWNER after go-live force query", () => {
    localStorage.clear();
    sessionStorage.clear();
    expect(
      shouldShowStaffFirstRun({
        userId,
        restaurantId,
        role: "OWNER",
        forceFromQuery: true
      })
    ).toBe(true);
  });

  it("hides after the tour is marked done", () => {
    localStorage.clear();
    sessionStorage.clear();
    markStaffFirstRunDone(userId, restaurantId);
    expect(isStaffFirstRunDone(userId, restaurantId)).toBe(true);
    expect(
      shouldShowStaffFirstRun({
        userId,
        restaurantId,
        role: "OWNER",
        forceFromQuery: true
      })
    ).toBe(false);
  });
});
