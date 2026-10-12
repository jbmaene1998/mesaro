import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/features/auth/api";
import { useI18n } from "@/i18n";
import { showApiError } from "@/lib/toast";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password")
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return "weak";
  if (score === 2) return "medium";
  return "strong";
}

export function ResetPasswordPage() {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  const passwordValue = form.watch("password");
  const strength = useMemo(() => getPasswordStrength(passwordValue || ""), [passwordValue]);

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    const timerId = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 3000);

    return () => window.clearTimeout(timerId);
  }, [isSuccess, navigate]);

  if (!token) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{copy.invalidResetLink}</CardTitle>
          <CardDescription>{copy.missingToken}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/forgot-password" className="text-sm underline underline-offset-4">
            {copy.requestNewResetLink}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setErrorMessage(null);

    try {
      await resetPassword(token, values.password);
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(copy.invalidOrExpired);
      showApiError(error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {copy.backToLogin}
        </Link>
        <CardTitle>{copy.resetPassword}</CardTitle>
        <CardDescription>{copy.createNewPassword}</CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">{copy.passwordUpdated}</p>
            <p className="text-sm text-muted-foreground">{copy.redirecting}</p>
            <Link to="/login" className="text-sm underline underline-offset-4">
              {copy.goToLoginNow}
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                {copy.newPassword}
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(form.formState.errors.password)}
                aria-describedby={form.formState.errors.password ? "reset-password-error" : undefined}
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p id="reset-password-error" className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {copy.strength}:{" "}
                <span className={strength === "strong" ? "text-green-600" : strength === "medium" ? "text-amber-600" : "text-destructive"}>
                  {strength}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                {copy.confirmPassword}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                aria-describedby={form.formState.errors.confirmPassword ? "reset-confirm-password-error" : undefined}
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword ? (
                <p id="reset-confirm-password-error" className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>
            {errorMessage ? (
              <p className="text-sm text-destructive">
                {errorMessage}{" "}
                <Link to="/forgot-password" className="underline underline-offset-4">
                  {copy.requestNewOne}
                </Link>
              </p>
            ) : null}
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? copy.updating : copy.updatePassword}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

const COPY = {
  en: {
    invalidResetLink: "Invalid Reset Link",
    missingToken: "This password reset link is missing a token.",
    requestNewResetLink: "Request a new reset link",
    invalidOrExpired: "This reset link is invalid or expired. Request a new password reset link.",
    backToLogin: "Back to Login",
    resetPassword: "Reset Password",
    createNewPassword: "Create a new password for your account.",
    passwordUpdated: "Password updated successfully.",
    redirecting: "Redirecting to login in 3 seconds...",
    goToLoginNow: "Go to Login now",
    newPassword: "New Password",
    strength: "Strength",
    confirmPassword: "Confirm Password",
    requestNewOne: "Request a new one",
    updating: "Updating...",
    updatePassword: "Update Password"
  },
  nl: {
    invalidResetLink: "Ongeldige resetlink",
    missingToken: "Deze resetlink mist een token.",
    requestNewResetLink: "Vraag een nieuwe resetlink aan",
    invalidOrExpired: "Deze resetlink is ongeldig of verlopen. Vraag een nieuwe aan.",
    backToLogin: "Terug naar login",
    resetPassword: "Wachtwoord resetten",
    createNewPassword: "Maak een nieuw wachtwoord voor je account.",
    passwordUpdated: "Wachtwoord succesvol bijgewerkt.",
    redirecting: "Doorsturen naar login in 3 seconden...",
    goToLoginNow: "Ga nu naar login",
    newPassword: "Nieuw wachtwoord",
    strength: "Sterkte",
    confirmPassword: "Bevestig wachtwoord",
    requestNewOne: "Vraag een nieuwe aan",
    updating: "Bijwerken...",
    updatePassword: "Wachtwoord bijwerken"
  },
  fr: {
    invalidResetLink: "Lien de reinitialisation invalide",
    missingToken: "Ce lien de reinitialisation ne contient pas de token.",
    requestNewResetLink: "Demander un nouveau lien",
    invalidOrExpired: "Ce lien est invalide ou expire. Demandez-en un nouveau.",
    backToLogin: "Retour a la connexion",
    resetPassword: "Reinitialiser le mot de passe",
    createNewPassword: "Creez un nouveau mot de passe pour votre compte.",
    passwordUpdated: "Mot de passe mis a jour avec succes.",
    redirecting: "Redirection vers la connexion dans 3 secondes...",
    goToLoginNow: "Aller a la connexion",
    newPassword: "Nouveau mot de passe",
    strength: "Force",
    confirmPassword: "Confirmer le mot de passe",
    requestNewOne: "En demander un nouveau",
    updating: "Mise a jour...",
    updatePassword: "Mettre a jour le mot de passe"
  },
  es: {
    invalidResetLink: "Enlace de restablecimiento invalido",
    missingToken: "Este enlace no contiene token.",
    requestNewResetLink: "Solicitar un nuevo enlace",
    invalidOrExpired: "Este enlace es invalido o vencio. Solicita uno nuevo.",
    backToLogin: "Volver al inicio de sesion",
    resetPassword: "Restablecer contrasena",
    createNewPassword: "Crea una nueva contrasena para tu cuenta.",
    passwordUpdated: "Contrasena actualizada correctamente.",
    redirecting: "Redirigiendo al login en 3 segundos...",
    goToLoginNow: "Ir al login ahora",
    newPassword: "Nueva contrasena",
    strength: "Fortaleza",
    confirmPassword: "Confirmar contrasena",
    requestNewOne: "Solicitar uno nuevo",
    updating: "Actualizando...",
    updatePassword: "Actualizar contrasena"
  }
} as const;
