import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "@/routes";
import { AuthProvider } from "@/stores/auth-context";
import { RestaurantProvider } from "@/stores/restaurant-context";
import { queryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/sonner";
import { RouteAnalyticsTracker } from "@/components/analytics/RouteAnalyticsTracker";
import { AnalyticsConsentBanner } from "@/components/analytics/AnalyticsConsentBanner";
import { I18nProvider } from "@/i18n";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RestaurantProvider>
          <I18nProvider>
            <BrowserRouter>
              <RouteAnalyticsTracker />
              <AppRoutes />
              <AnalyticsConsentBanner />
              <Toaster richColors position="top-right" />
            </BrowserRouter>
          </I18nProvider>
        </RestaurantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
