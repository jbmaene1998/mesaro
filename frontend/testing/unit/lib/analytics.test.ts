import { describe, expect, it, vi } from "vitest";

import { ANALYTICS_EVENTS, isValidAnalyticsEventName, trackEvent } from "@/lib/analytics";
import { setAnalyticsConsent } from "@/lib/analytics-consent";

vi.mock("@/api/analytics", () => ({
  captureAnalyticsEvent: vi.fn().mockResolvedValue(undefined)
}));

describe("analytics", () => {
  it("tracks valid events via custom event and dataLayer", () => {
    setAnalyticsConsent("granted");
    const listener = vi.fn();
    window.addEventListener("analytics:track", listener as EventListener);
    window.dataLayer = [];

    const tracked = trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN_SUBMIT, {
      page: "login",
      hasReturnUrl: true
    });

    expect(tracked).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer?.[0]).toMatchObject({
      event: ANALYTICS_EVENTS.AUTH_LOGIN_SUBMIT,
      page: "login",
      hasReturnUrl: true
    });

    window.removeEventListener("analytics:track", listener as EventListener);
  });

  it("rejects invalid event names", () => {
    setAnalyticsConsent("granted");
    const listener = vi.fn();
    window.addEventListener("analytics:track", listener as EventListener);

    const tracked = trackEvent("Auth Login Submit", { page: "login" });

    expect(tracked).toBe(false);
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener("analytics:track", listener as EventListener);
  });

  it("strips non-primitive analytics properties", () => {
    setAnalyticsConsent("granted");
    window.dataLayer = [];

    trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN_FAILURE, {
      page: "login",
      nested: { ignore: true },
      code: 401
    });

    expect(window.dataLayer?.[0]).toMatchObject({
      event: ANALYTICS_EVENTS.AUTH_LOGIN_FAILURE,
      page: "login",
      code: 401
    });
    expect(window.dataLayer?.[0]).not.toHaveProperty("nested");
  });

  it("strips sensitive token and query-style properties", () => {
    setAnalyticsConsent("granted");
    window.dataLayer = [];

    trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
      pathname: "/r/test/reservation/ABC",
      search: "?cancelToken=secret",
      cancelToken: "secret",
      hold_token: "secret",
      safe: true
    });

    expect(window.dataLayer?.[0]).toMatchObject({
      event: ANALYTICS_EVENTS.PAGE_VIEW,
      pathname: "/r/test/reservation/ABC",
      safe: true
    });
    expect(window.dataLayer?.[0]).not.toHaveProperty("search");
    expect(window.dataLayer?.[0]).not.toHaveProperty("cancelToken");
    expect(window.dataLayer?.[0]).not.toHaveProperty("hold_token");
  });

  it("validates event-name format", () => {
    expect(isValidAnalyticsEventName("auth_login_submit")).toBe(true);
    expect(isValidAnalyticsEventName("auth-login-submit")).toBe(false);
  });

  it("does not track events without consent", () => {
    localStorage.removeItem("mesaro.analyticsConsent");
    window.dataLayer = [];

    const tracked = trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN_SUBMIT, { page: "login" });

    expect(tracked).toBe(false);
    expect(window.dataLayer).toHaveLength(0);
  });
});
