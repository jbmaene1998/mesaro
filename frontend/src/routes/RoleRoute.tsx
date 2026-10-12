import type { PropsWithChildren } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";

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

function AccessDeniedPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("access.deniedTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("access.deniedDescription")}
        </CardContent>
      </Card>
    </div>
  );
}

interface RoleRouteProps extends PropsWithChildren {
  minimumRole: AppRole;
}

export function RoleRoute({ minimumRole, children }: RoleRouteProps) {
  const currentRole = useUserRole() as AppRole | null;

  if (!hasRequiredRole(currentRole, minimumRole)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
