import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { verifyEmail } from "@/api/auth";
import type { AuthTokens } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineLoader } from "@/components/ui/loading";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { showApiError } from "@/lib/toast";

function restaurantCount(accessToken: string) {
  try {
    const payloadSegment = accessToken.split(".")[1];
    if (!payloadSegment) {
      return 0;
    }
    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { restaurants?: unknown };
    const restaurants = typeof payload.restaurants === "string"
      ? JSON.parse(payload.restaurants) as unknown
      : payload.restaurants;
    return Array.isArray(restaurants) ? restaurants.length : 0;
  } catch {
    return 0;
  }
}

export function VerifyEmailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthTokens } = useAuth();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"working" | "error">(token ? "working" : "error");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const tokens: AuthTokens = await verifyEmail(token);
        if (cancelled) {
          return;
        }
        setAuthTokens(tokens);
        const nextPath = restaurantCount(tokens.accessToken) === 0 ? "/onboarding" : "/dashboard";
        window.setTimeout(() => {
          if (!cancelled) {
            navigate(nextPath, { replace: true });
          }
        }, 0);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setStatus("error");
        showApiError(error);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, setAuthTokens, token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("register.checkEmailTitle")}</CardTitle>
        <CardDescription>
          {status === "error" ? t("register.verificationInvalid") : t("register.verifyingAccount")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "working" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <InlineLoader />
            {t("register.verifyingAccount")}
          </p>
        ) : null}
        {status === "error" ? (
          <Button type="button" className="w-full" asChild>
            <Link to="/login">{t("register.logInHere")}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
