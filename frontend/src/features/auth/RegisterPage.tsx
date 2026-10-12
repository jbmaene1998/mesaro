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
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
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
      setError(copy.ownerNameValidation);
      return;
    }
    if (!EMAIL_REGEX.test(ownerEmail.trim())) {
      setError(copy.emailValidation);
      return;
    }
    if (ownerPassword.length < 8) {
      setError(copy.passwordValidation);
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
      setError(copy.registerFailed);
      showApiError(submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="owner-name" className="text-sm font-medium">{copy.yourName}</label>
          <Input
            id="owner-name"
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            placeholder={copy.ownerNamePlaceholder}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="owner-email" className="text-sm font-medium">{copy.workEmail}</label>
          <Input
            id="owner-email"
            type="email"
            autoComplete="email"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            placeholder={copy.workEmailPlaceholder}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="owner-password" className="text-sm font-medium">{copy.password}</label>
          <Input
            id="owner-password"
            type="password"
            autoComplete="new-password"
            value={ownerPassword}
            onChange={(event) => setOwnerPassword(event.target.value)}
            placeholder={copy.minimumEightCharacters}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="owner-phone" className="text-sm font-medium">{copy.phoneOptional}</label>
          <Input
            id="owner-phone"
            value={ownerPhone}
            onChange={(event) => setOwnerPhone(event.target.value)}
            placeholder={copy.phonePlaceholder}
          />
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="button" className="w-full" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? copy.creatingAccount : copy.createAccount}
        </Button>

        <p className="text-xs text-muted-foreground">
          {copy.alreadyInvited} <Link to="/login" className="underline underline-offset-4">{copy.logInHere}</Link>.
        </p>
      </CardContent>
    </Card>
  );
}

const EN_COPY = {
  title: "Create your account",
  subtitle: "Create your owner account first, then set up your first restaurant.",
  yourName: "Your name",
  ownerNamePlaceholder: "Alex Taylor",
  workEmail: "Work email",
  workEmailPlaceholder: "you@restaurant.com",
  password: "Password",
  minimumEightCharacters: "Minimum 8 characters",
  phoneOptional: "Phone (optional)",
  phonePlaceholder: "+32 ...",
  createAccount: "Create account",
  creatingAccount: "Creating account...",
  ownerNameValidation: "Enter your name.",
  emailValidation: "Enter a valid work email.",
  passwordValidation: "Password must contain at least 8 characters.",
  registerFailed: "We couldn't create your account right now. Please try again.",
  alreadyInvited: "Already invited?",
  logInHere: "Log in here"
} as const;

const COPY = {
  en: EN_COPY,
  nl: EN_COPY,
  fr: EN_COPY,
  es: EN_COPY
} as const;
