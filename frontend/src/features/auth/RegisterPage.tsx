import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";

import { EMAIL_REGEX } from "@/features/auth/register-utils";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { showApiError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated, restaurants, register } = useAuth();
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to={restaurants.length === 0 ? "/onboarding/setup" : "/dashboard"} replace />;
  }

  const handleSubmit = async () => {
    if (!ownerName.trim()) {
      setError(t("register.ownerNameValidation"));
      return;
    }
    if (!EMAIL_REGEX.test(ownerEmail.trim())) {
      setError(t("register.emailValidation"));
      return;
    }
    if (ownerPassword.length < 8) {
      setError(t("register.passwordValidation"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await register({
        email: ownerEmail.trim(),
        password: ownerPassword,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim() || undefined
      });
      navigate("/onboarding/setup", { replace: true });
    } catch (submitError) {
      setError(t("register.registerFailed"));
      showApiError(submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("register.title")}</CardTitle>
        <CardDescription>{t("register.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="owner-name" className="text-sm font-medium">{t("register.yourName")}</label>
          <Input
            id="owner-name"
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            placeholder={t("register.ownerNamePlaceholder")}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="owner-email" className="text-sm font-medium">{t("register.workEmail")}</label>
          <Input
            id="owner-email"
            type="email"
            autoComplete="email"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            placeholder={t("register.workEmailPlaceholder")}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="owner-password" className="text-sm font-medium">{t("register.password")}</label>
          <Input
            id="owner-password"
            type="password"
            autoComplete="new-password"
            value={ownerPassword}
            onChange={(event) => setOwnerPassword(event.target.value)}
            placeholder={t("register.minimumEightCharacters")}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="owner-phone" className="text-sm font-medium">{t("register.phoneOptional")}</label>
          <Input
            id="owner-phone"
            value={ownerPhone}
            onChange={(event) => setOwnerPhone(event.target.value)}
            placeholder={t("register.phonePlaceholder")}
          />
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="button" className="w-full" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? t("register.creatingAccount") : t("register.createAccount")}
        </Button>

        <p className="text-xs text-muted-foreground">
          {t("register.alreadyInvited")}{" "}
          <Link to="/login" className="underline underline-offset-4">{t("register.logInHere")}</Link>.
        </p>
      </CardContent>
    </Card>
  );
}
