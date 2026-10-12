import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

function sanitizePathname(pathname: string) {
  return pathname
    .replace(/(\/(?:r|embed)\/[^/]+\/confirm)\/[^/]+/i, "$1/[redacted]")
    .replace(/(\/(?:r|embed)\/[^/]+\/reservation\/[^/?#]+)\?.*$/i, "$1");
}

export function RouteAnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
      pathname: sanitizePathname(location.pathname)
    });
  }, [location.pathname]);

  return null;
}
