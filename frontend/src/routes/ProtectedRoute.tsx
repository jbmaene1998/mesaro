import { type PropsWithChildren } from "react";
import { Navigate, type Location, useLocation } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { useAuth, useUserRole } from "@/hooks/use-auth";

type AppRole = "STAFF" | "MANAGER" | "OWNER";

const ROLE_RANK: Record<AppRole, number> = {
  STAFF: 1,
  MANAGER: 2,
  OWNER: 3
};

function hasRequiredRole(currentRole: AppRole | null, minimumRole: AppRole) {
  if (!currentRole) {
    return false;
  }

  return ROLE_RANK[currentRole] >= ROLE_RANK[minimumRole];
}

function getReturnUrl(location: Location) {
  return `${location.pathname}${location.search}`;
}

function FullPageLoading() {
  return <PageLoader className="min-h-screen" />;
}

function AccessDeniedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>403 Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You do not have permission to access this page.
        </CardContent>
      </Card>
    </div>
  );
}

interface ProtectedRouteProps extends PropsWithChildren {
  minimumRole?: AppRole;
}

function isOnboardingPath(pathname: string) {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

export function ProtectedRoute({ children, minimumRole }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, restaurants } = useAuth();
  const currentRole = useUserRole() as AppRole | null;

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    const returnUrl = getReturnUrl(location);
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  const noRestaurants = restaurants.length === 0;
  const onOnboarding = isOnboardingPath(location.pathname);

  if (noRestaurants && !onOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (minimumRole && !hasRequiredRole(currentRole, minimumRole)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
