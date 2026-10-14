import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineLoader } from "@/components/ui/loading";
import { acceptInvite, previewInvite, type AcceptInviteResult, type StaffInvitePreview } from "@/features/auth/api";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { showApiError } from "@/lib/toast";
import { markStaffFirstRunPending } from "@/features/onboarding/staffFirstRun";

type InviteErrorKind = "expired" | "invalid" | "already-accepted";

function buildAcceptInviteSchema(passwordRequired: boolean) {
  return z
    .object({
      password: z.string(),
      confirmPassword: z.string()
    })
    .superRefine((values, ctx) => {
      const password = values.password.trim();
      const confirmPassword = values.confirmPassword.trim();

      if (passwordRequired) {
        if (password.length < 8) {
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
        return;
      }

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
}

type AcceptInviteFormValues = z.infer<ReturnType<typeof buildAcceptInviteSchema>>;

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
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const navigate = useNavigate();
  const { setAuthTokens } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [preview, setPreview] = useState<StaffInvitePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(Boolean(inviteToken));
  const [errorKind, setErrorKind] = useState<InviteErrorKind | null>(null);

  const passwordRequired = preview?.passwordRequired ?? true;
  const schema = useMemo(() => buildAcceptInviteSchema(passwordRequired), [passwordRequired]);

  const form = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    form.clearErrors();
  }, [form, schema]);

  useEffect(() => {
    if (!inviteToken) {
      setPreviewLoading(false);
      setErrorKind("invalid");
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    void previewInvite(inviteToken)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setPreview(data);
        if (data.alreadyAccepted) {
          setErrorKind("already-accepted");
        } else if (data.expired) {
          setErrorKind("expired");
        } else {
          setErrorKind(null);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setErrorKind(normalizeInviteError(error));
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!inviteToken) {
      setErrorKind("invalid");
      return;
    }

    setIsSubmitting(true);
    setErrorKind(null);

    try {
      const trimmedPassword = values.password.trim();
      const result: AcceptInviteResult = await acceptInvite(
        inviteToken,
        trimmedPassword.length > 0 ? trimmedPassword : undefined
      );
      if (result.verificationRequired || !result.accessToken || !result.refreshToken) {
        setNeedsVerification(true);
        return;
      }
      setAuthTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn ?? 900
      });
      markStaffFirstRunPending();
      setIsSuccess(true);
      window.setTimeout(() => {
        navigate("/dashboard?tour=1", { replace: true });
      }, 1500);
    } catch (error) {
      setErrorKind(normalizeInviteError(error));
      showApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  });

  const restaurantLabel = preview?.restaurantName ?? copy.yourRestaurant;
  const roleLabel = preview?.role ? preview.role.toLowerCase() : "staff";

  const title = useMemo(() => {
    if (isSuccess || needsVerification) {
      return copy.welcomeToMesaro;
    }
    if (errorKind && !inviteToken) {
      return copy.inviteError;
    }
    return copy.acceptingInvite;
  }, [copy.acceptingInvite, copy.inviteError, copy.welcomeToMesaro, errorKind, inviteToken, isSuccess, needsVerification]);

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
        {!isSuccess && !needsVerification && !previewLoading ? (
          <CardDescription>
            {preview && !errorKind
              ? copy.joinAs.replace("{restaurant}", restaurantLabel).replace("{role}", roleLabel)
              : copy.validatingInvite}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {previewLoading ? (
          <div className="space-y-2">
            <InlineLoader />
            <p className="text-sm text-muted-foreground">{copy.loadingPreview}</p>
          </div>
        ) : null}

        {needsVerification ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">{copy.verifyEmailBody}</p>
            <Link to="/login" className="text-sm underline underline-offset-4">
              {copy.goToLogin}
            </Link>
          </div>
        ) : null}

        {isSuccess ? (
          <div className="space-y-2">
            <p className="text-sm">
              {copy.welcomeAddedTo} {restaurantLabel}.
            </p>
            <p className="text-sm text-muted-foreground">{copy.redirectingDashboard}</p>
          </div>
        ) : null}

        {!isSuccess && !needsVerification && !previewLoading && errorKind ? (
          <div className="mb-4 space-y-3">
            <p className="text-sm text-destructive">{getErrorContent(errorKind)}</p>
            {errorKind === "already-accepted" ? (
              <Link to="/login" className="text-sm underline underline-offset-4">
                {copy.goToLogin}
              </Link>
            ) : null}
          </div>
        ) : null}

        {!isSuccess && !needsVerification && !previewLoading && preview && !preview.alreadyAccepted && !preview.expired ? (
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <p className="text-sm text-muted-foreground">
              {passwordRequired ? copy.passwordRequiredHint : copy.passwordOptionalHint}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="invite-password">
                {copy.passwordLabel}
                {!passwordRequired ? ` (${copy.optional})` : ""}
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
    acceptingInvite: "Join your team",
    welcomeToMesaro: "Welcome to Mesaro",
    inviteError: "Invite Error",
    validatingInvite: "Checking your invitation...",
    loadingPreview: "Loading invitation...",
    joinAs: "You've been invited to {restaurant} as {role}.",
    welcomeAddedTo: "Welcome to Mesaro! You've been added to",
    redirectingDashboard: "Taking you to a short floor tour...",
    invalidInviteLink: "Invalid invite link",
    goToLogin: "Go to Login",
    passwordRequiredHint: "Choose a password (at least 8 characters) to create your account.",
    passwordOptionalHint: "You already have a Mesaro account — leave the password blank, or set a new one only if you intend to change it later via account settings (leave blank to keep yours).",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    optional: "optional",
    acceptInvite: "Accept invite",
    yourRestaurant: "your restaurant",
    verifyEmailBody: "We sent a verify-your-account email. Open that link before you sign in. Until then, onboarding and the rest of Mesaro stay locked."
  },
  nl: {
    acceptingInvite: "Word lid van je team",
    welcomeToMesaro: "Welkom bij Mesaro",
    inviteError: "Uitnodigingsfout",
    validatingInvite: "Uitnodiging controleren...",
    loadingPreview: "Uitnodiging laden...",
    joinAs: "Je bent uitgenodigd voor {restaurant} als {role}.",
    welcomeAddedTo: "Welkom bij Mesaro! Je bent toegevoegd aan",
    redirectingDashboard: "Doorsturen naar een korte floor-tour...",
    invalidInviteLink: "Ongeldige uitnodigingslink",
    goToLogin: "Ga naar login",
    passwordRequiredHint: "Kies een wachtwoord (minimaal 8 tekens) om je account aan te maken.",
    passwordOptionalHint: "Je hebt al een Mesaro-account — laat het wachtwoord leeg.",
    passwordLabel: "Wachtwoord",
    confirmPasswordLabel: "Bevestig wachtwoord",
    optional: "optioneel",
    acceptInvite: "Uitnodiging accepteren",
    yourRestaurant: "je restaurant",
    verifyEmailBody: "We hebben een e-mail gestuurd om je account te bevestigen. Open die link voordat je inlogt. Tot dan blijven onboarding en de rest van Mesaro gesloten."
  },
  fr: {
    acceptingInvite: "Rejoindre votre equipe",
    welcomeToMesaro: "Bienvenue sur Mesaro",
    inviteError: "Erreur d'invitation",
    validatingInvite: "Verification de l'invitation...",
    loadingPreview: "Chargement de l'invitation...",
    joinAs: "Vous etes invite a {restaurant} en tant que {role}.",
    welcomeAddedTo: "Bienvenue sur Mesaro ! Vous avez ete ajoute a",
    redirectingDashboard: "Redirection vers une courte visite du floor...",
    invalidInviteLink: "Lien d'invitation invalide",
    goToLogin: "Aller a la connexion",
    passwordRequiredHint: "Choisissez un mot de passe (8 caracteres minimum) pour creer votre compte.",
    passwordOptionalHint: "Vous avez deja un compte Mesaro — laissez le mot de passe vide.",
    passwordLabel: "Mot de passe",
    confirmPasswordLabel: "Confirmer le mot de passe",
    optional: "optionnel",
    acceptInvite: "Accepter l'invitation",
    yourRestaurant: "votre restaurant",
    verifyEmailBody: "Nous avons envoye un e-mail pour verifier votre compte. Ouvrez ce lien avant de vous connecter. Jusque-la, l'onboarding et le reste de Mesaro restent bloques."
  },
  es: {
    acceptingInvite: "Unete a tu equipo",
    welcomeToMesaro: "Bienvenido a Mesaro",
    inviteError: "Error de invitacion",
    validatingInvite: "Comprobando tu invitacion...",
    loadingPreview: "Cargando invitacion...",
    joinAs: "Te han invitado a {restaurant} como {role}.",
    welcomeAddedTo: "Bienvenido a Mesaro! Has sido agregado a",
    redirectingDashboard: "Te llevamos a un recorrido corto del floor...",
    invalidInviteLink: "Enlace de invitacion invalido",
    goToLogin: "Ir al login",
    passwordRequiredHint: "Elige una contrasena (minimo 8 caracteres) para crear tu cuenta.",
    passwordOptionalHint: "Ya tienes una cuenta Mesaro — deja la contrasena en blanco.",
    passwordLabel: "Contrasena",
    confirmPasswordLabel: "Confirmar contrasena",
    optional: "opcional",
    acceptInvite: "Aceptar invitacion",
    yourRestaurant: "tu restaurante",
    verifyEmailBody: "Te enviamos un correo para verificar tu cuenta. Abre ese enlace antes de iniciar sesion. Hasta entonces, el onboarding y el resto de Mesaro permanecen bloqueados."
  }
} as const;
