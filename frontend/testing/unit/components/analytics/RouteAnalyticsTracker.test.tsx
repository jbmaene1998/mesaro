import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { RouteAnalyticsTracker } from "@/components/analytics/RouteAnalyticsTracker";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({
  ANALYTICS_EVENTS: {
    PAGE_VIEW: "page_view"
  },
  trackEvent: vi.fn()
}));

describe("RouteAnalyticsTracker", () => {
  it("tracks page view with pathname only (no search params)", () => {
    render(
      <MemoryRouter initialEntries={["/r/test-restaurant/reservation/RES-1?cancelToken=secret"]}>
        <RouteAnalyticsTracker />
      </MemoryRouter>
    );

    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.PAGE_VIEW, {
      pathname: "/r/test-restaurant/reservation/RES-1"
    });
  });
});
