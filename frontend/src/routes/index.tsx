import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { WidgetLayout } from "@/components/layout/WidgetLayout";
import { AccountPage } from "@/features/account/AccountPage";
import { AcceptInvitePage } from "@/features/auth/AcceptInvitePage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { ConfirmReservationPage } from "@/features/booking/ConfirmReservationPage";
import { GuestBookingPage } from "@/features/booking/GuestBookingPage";
import { ReservationDetailsPage } from "@/features/booking/ReservationDetailsPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { GoLiveWizardPage } from "@/features/onboarding/GoLiveWizardPage";
import { StaffPlanningPage } from "@/features/planning/StaffPlanningPage";
import { ReservationDetailPage } from "@/features/reservations/ReservationDetailPage";
import { ReservationListPage } from "@/features/reservations/ReservationListPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ShiftManagementPage } from "@/features/shifts/ShiftManagementPage";
import { StaffManagementPage } from "@/features/staff/StaffManagementPage";
import { TableManagementPage } from "@/features/tables/TableManagementPage";
import { TimelinePage } from "@/features/timeline/TimelinePage";
import { VacationManagementPage } from "@/features/vacations/VacationManagementPage";
import BillingCancelPage from "@/features/billing/BillingCancelPage";
import BillingSettingsPage from "@/features/billing/BillingSettingsPage";
import BillingSuccessPage from "@/features/billing/BillingSuccessPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";

const HomePage = lazy(() =>
  import("@/features/marketing/pages/HomePage").then((m) => ({ default: m.HomePage }))
);
const FeaturesPage = lazy(() =>
  import("@/features/marketing/FeaturesPage").then((m) => ({ default: m.FeaturesPage }))
);
const PricingPage = lazy(() =>
  import("@/features/marketing/PricingPage").then((m) => ({ default: m.PricingPage }))
);
const AboutPage = lazy(() =>
  import("@/features/marketing/AboutPage").then((m) => ({ default: m.AboutPage }))
);
const FaqPage = lazy(() =>
  import("@/features/marketing/FaqPage").then((m) => ({ default: m.FaqPage }))
);
const ContactPage = lazy(() =>
  import("@/features/marketing/ContactPage").then((m) => ({ default: m.ContactPage }))
);
const PrivacyPage = lazy(() =>
  import("@/features/marketing/PrivacyPage").then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import("@/features/marketing/TermsPage").then((m) => ({ default: m.TermsPage }))
);

function MarketingFallback() {
  return <div className="min-h-[40vh]" aria-hidden />;
}

function InviteAcceptRedirect() {
  const [params] = useSearchParams();
  const token = params.get("token");
  return (
    <Navigate
      to={token ? `/accept-invite?token=${encodeURIComponent(token)}` : "/accept-invite"}
      replace
    />
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<MarketingFallback />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="/features"
          element={
            <Suspense fallback={<MarketingFallback />}>
              <FeaturesPage />
            </Suspense>
          }
        />
        <Route
          path="/pricing"
          element={
            <Suspense fallback={<MarketingFallback />}>
              <PricingPage />
            </Suspense>
          }
        />
        <Route
          path="/about"
          element={
            <Suspense fallback={<MarketingFallback />}>
              <AboutPage />
            </Suspense>
          }
        />
        <Route
          path="/faq"
          element={
            <Suspense fallback={<MarketingFallback />}>
              <FaqPage />
            </Suspense>
          }
        />
        <Route
          path="/contact"
          element={
            <Suspense fallback={<MarketingFallback />}>
              <ContactPage />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<MarketingFallback />}>
              <PrivacyPage />
            </Suspense>
          }
        />
        <Route
          path="/terms"
          element={
            <Suspense fallback={<MarketingFallback />}>
              <TermsPage />
            </Suspense>
          }
        />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/invite/accept" element={<InviteAcceptRedirect />} />
      </Route>

      <Route element={<GuestLayout />}>
        <Route path="/r/:slug" element={<GuestBookingPage />} />
        <Route path="/r/:slug/confirm/:holdToken" element={<ConfirmReservationPage />} />
        <Route path="/r/:slug/reservation/:code" element={<ReservationDetailsPage />} />
      </Route>

      <Route element={<WidgetLayout />}>
        <Route path="/embed/:slug" element={<GuestBookingPage />} />
        <Route path="/embed/:slug/confirm/:holdToken" element={<ConfirmReservationPage />} />
        <Route path="/embed/:slug/reservation/:code" element={<ReservationDetailsPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route
          path="/planning"
          element={
            <RoleRoute minimumRole="STAFF">
              <StaffPlanningPage />
            </RoleRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleRoute minimumRole="MANAGER">
              <ReportsPage />
            </RoleRoute>
          }
        />
        <Route path="/reservations" element={<ReservationListPage />} />
        <Route path="/reservations/:id" element={<ReservationDetailPage />} />

        <Route
          path="/tables"
          element={
            <RoleRoute minimumRole="MANAGER">
              <TableManagementPage />
            </RoleRoute>
          }
        />
        <Route
          path="/shifts"
          element={
            <RoleRoute minimumRole="MANAGER">
              <ShiftManagementPage />
            </RoleRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <RoleRoute minimumRole="MANAGER">
              <StaffManagementPage />
            </RoleRoute>
          }
        />
        <Route path="/vacations" element={<VacationManagementPage />} />
        <Route
          path="/settings"
          element={
            <RoleRoute minimumRole="OWNER">
              <SettingsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/settings/billing"
          element={
            <RoleRoute minimumRole="OWNER">
              <BillingSettingsPage />
            </RoleRoute>
          }
        />
      </Route>

      {/* Stripe post-checkout landing pages (no auth required — Stripe redirects here) */}
      <Route path="/billing/success" element={<BillingSuccessPage />} />
      <Route path="/billing/cancel" element={<BillingCancelPage />} />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <GoLiveWizardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/onboarding/setup" element={<Navigate to="/onboarding" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
