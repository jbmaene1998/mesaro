import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { AuthResponse } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { acceptInvite } from "@/features/auth/api";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { showApiError } from "@/lib/toast";

type InviteErrorKind = "expired" | "invalid" | "already-accepted";

const acceptInviteSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string()
  })
  .superRefine((values, ctx) => {
    const password = values.password.trim();
    const confirmPassword = values.confirmPassword.trim();

    if (password.length === 0 && confirmPassword.length === 0) {
      return;
    }

    if (password.length > 0 && password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must be at least 8 characters"
      });
    }

    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match"
      });
    }
  });

type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;

function decodeRestaurantLabel(accessToken: string) {
  try {
    const rawPayload = accessToken.split(".")[1] ?? "";
    const normalized = rawPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as {
      restaurants?: Array<{ name?: string; restaurantName?: string; slug?: string; restaurantId?: string }>;
    };
    const firstRestaurant = payload.restaurants?.[0];
    return firstRestaurant?.name ?? firstRestaurant?.restaurantName ?? firstRestaurant?.slug ?? firstRestaurant?.restaurantId ?? "your restaurant";
  } catch {
    return "your restaurant";
  }
}

function normalizeInviteError(error: unknown): InviteErrorKind {
  if (typeof error === "object" && error !== null) {
    const code = "code" in error ? String((error as { code?: unknown }).code || "").toLowerCase() : "";
    const message = "message" in error ? String((error as { message?: unknown }).message || "").toLowerCase() : "";

    if (code.includes("expired") || message.includes("expired")) {
      return "expired";
    }

    if (code.includes("already") || message.includes("already") || message.includes("used")) {
      return "already-accepted";
    }
  }

  return "invalid";
}

function getErrorContent(errorKind: InviteErrorKind) {
  if (errorKind === "expired") {
    return "This invite has expired. Please ask your manager to send a new one.";
  }

  if (errorKind === "already-accepted") {
    return "This invite has already been used. Try logging in instead.";
  }

  return "This invite link is invalid.";
}

export function AcceptInvitePage() {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const navigate = useNavigate();
  const { setAuthTokens } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [restaurantLabel, setRestaurantLabel] = useState("your restaurant");
  const [errorKind, setErrorKind] = useState<InviteErrorKind | null>(null);

  const form = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!inviteToken) {
      setErrorKind("invalid");
      return;
    }

    setIsSubmitting(true);
    setErrorKind(null);

    try {
      const trimmedPassword = values.password.trim();
      const tokens: AuthResponse = await acceptInvite(
        inviteToken,
        trimmedPassword.length > 0 ? trimmedPassword : undefined
      );
      setAuthTokens(tokens);
      setRestaurantLabel(decodeRestaurantLabel(tokens.accessToken));
      setIsSuccess(true);
      window.setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    } catch (error) {
      setErrorKind(normalizeInviteError(error));
      showApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  });

  const title = useMemo(() => {
    if (isSuccess) {
      return copy.welcomeToMesaro;
    }

    if (errorKind && !inviteToken) {
      return copy.inviteError;
    }

    return copy.acceptingInvite;
  }, [copy.acceptingInvite, copy.inviteError, copy.welcomeToMesaro, errorKind, inviteToken, isSuccess]);

  if (!inviteToken) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{copy.inviteError}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{copy.invalidInviteLink}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {!isSuccess ? <CardDescription>{copy.validatingInvite}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="space-y-2">
            <p className="text-sm">
              {copy.welcomeAddedTo} {restaurantLabel}.
            </p>
            <p className="text-sm text-muted-foreground">{copy.redirectingDashboard}</p>
          </div>
        ) : null}

        {!isSuccess && errorKind ? (
          <div className="mb-4 space-y-3">
            <p className="text-sm text-destructive">{getErrorContent(errorKind)}</p>
            {errorKind === "already-accepted" ? (
              <Link to="/login" className="text-sm underline underline-offset-4">
                {copy.goToLogin}
              </Link>
            ) : null}
          </div>
        ) : null}

        {!isSuccess && errorKind !== "already-accepted" ? (
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <p className="text-sm text-muted-foreground">{copy.passwordHint}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invite-password">
                {copy.passwordLabel}
              </label>
              <Input
                id="invite-password"
                type="password"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invite-confirm-password">
                {copy.confirmPasswordLabel}
              </label>
              <Input
                id="invite-confirm-password"
                type="password"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword ? (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? copy.acceptingInvite : copy.acceptInvite}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

const COPY = {
  en: {
    acceptingInvite: "Accepting Invite",
    welcomeToMesaro: "Welcome to Mesaro",
    inviteError: "Invite Error",
    validatingInvite: "Set a password for new accounts, or leave blank if you already have one.",
    welcomeAddedTo: "Welcome to Mesaro! You've been added to",
    redirectingDashboard: "Redirecting to dashboard...",
    invalidInviteLink: "Invalid invite link",
    goToLogin: "Go to Login",
    passwordHint: "New team members must choose a password (at least 8 characters). Existing users can leave both fields blank.",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    acceptInvite: "Accept invite"
  },
  nl: {
    acceptingInvite: "Uitnodiging verwerken",
    welcomeToMesaro: "Welkom bij Mesaro",
    inviteError: "Uitnodigingsfout",
    validatingInvite: "Stel een wachtwoord in voor nieuwe accounts, of laat leeg als je er al een hebt.",
    welcomeAddedTo: "Welkom bij Mesaro! Je bent toegevoegd aan",
    redirectingDashboard: "Doorsturen naar dashboard...",
    invalidInviteLink: "Ongeldige uitnodigingslink",
    goToLogin: "Ga naar login",
    passwordHint: "Nieuwe teamleden moeten een wachtwoord kiezen (minimaal 8 tekens). Bestaande gebruikers kunnen beide velden leeg laten.",
    passwordLabel: "Wachtwoord",
    confirmPasswordLabel: "Bevestig wachtwoord",
    acceptInvite: "Uitnodiging accepteren"
  },
  fr: {
    acceptingInvite: "Acceptation de l'invitation",
    welcomeToMesaro: "Bienvenue sur Mesaro",
    inviteError: "Erreur d'invitation",
    validatingInvite: "Definissez un mot de passe pour les nouveaux comptes, ou laissez vide si vous en avez deja un.",
    welcomeAddedTo: "Bienvenue sur Mesaro ! Vous avez ete ajoute a",
    redirectingDashboard: "Redirection vers le tableau de bord...",
    invalidInviteLink: "Lien d'invitation invalide",
    goToLogin: "Aller a la connexion",
    passwordHint: "Les nouveaux membres doivent choisir un mot de passe (8 caracteres minimum). Les utilisateurs existants peuvent laisser les champs vides.",
    passwordLabel: "Mot de passe",
    confirmPasswordLabel: "Confirmer le mot de passe",
    acceptInvite: "Accepter l'invitation"
  },
  es: {
    acceptingInvite: "Aceptando invitacion",
    welcomeToMesaro: "Bienvenido a Mesaro",
    inviteError: "Error de invitacion",
    validatingInvite: "Establece una contrasena para cuentas nuevas, o dejala en blanco si ya tienes una.",
    welcomeAddedTo: "Bienvenido a Mesaro! Has sido agregado a",
    redirectingDashboard: "Redirigiendo al panel...",
    invalidInviteLink: "Enlace de invitacion invalido",
    goToLogin: "Ir al login",
    passwordHint: "Los nuevos miembros deben elegir una contrasena (minimo 8 caracteres). Los usuarios existentes pueden dejar los campos en blanco.",
    passwordLabel: "Contrasena",
    confirmPasswordLabel: "Confirmar contrasena",
    acceptInvite: "Aceptar invitacion"
  }
} as const;
