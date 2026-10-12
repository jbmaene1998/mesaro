import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { forgotPassword } from "@/features/auth/api";
import { useI18n } from "@/i18n";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address")
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    await forgotPassword(values.email);
    setSubmitted(true);
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {copy.backToLogin}
        </Link>
        <CardTitle>{copy.forgotPassword}</CardTitle>
        <CardDescription>{copy.enterEmailInstructions}</CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {copy.accountExistsMessage}
            </p>
            <Link to="/login" className="text-sm underline underline-offset-4">
              {copy.backToLogin}
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                {copy.email}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(form.formState.errors.email)}
                aria-describedby={form.formState.errors.email ? "forgot-password-email-error" : undefined}
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p id="forgot-password-email-error" className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? copy.sending : copy.sendResetLink}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

const COPY = {
  en: {
    backToLogin: "Back to Login",
    forgotPassword: "Forgot Password",
    enterEmailInstructions: "Enter your email and we'll send reset instructions.",
    accountExistsMessage: "If an account exists for that email, we've sent a password reset link. Check your inbox and spam folder.",
    email: "Email",
    sending: "Sending...",
    sendResetLink: "Send Reset Link"
  },
  nl: {
    backToLogin: "Terug naar login",
    forgotPassword: "Wachtwoord vergeten",
    enterEmailInstructions: "Voer je e-mail in en we sturen resetinstructies.",
    accountExistsMessage: "Als er een account bestaat voor dit e-mailadres, hebben we een resetlink gestuurd. Controleer je inbox en spam.",
    email: "E-mail",
    sending: "Versturen...",
    sendResetLink: "Stuur resetlink"
  },
  fr: {
    backToLogin: "Retour a la connexion",
    forgotPassword: "Mot de passe oublie",
    enterEmailInstructions: "Entrez votre e-mail et nous enverrons les instructions.",
    accountExistsMessage: "Si un compte existe pour cet e-mail, nous avons envoye un lien de reinitialisation. Verifiez votre boite et vos spams.",
    email: "E-mail",
    sending: "Envoi...",
    sendResetLink: "Envoyer le lien"
  },
  es: {
    backToLogin: "Volver al inicio de sesion",
    forgotPassword: "Olvide mi contrasena",
    enterEmailInstructions: "Ingresa tu correo y enviaremos instrucciones de restablecimiento.",
    accountExistsMessage: "Si existe una cuenta para ese correo, enviamos un enlace de restablecimiento. Revisa bandeja de entrada y spam.",
    email: "Correo",
    sending: "Enviando...",
    sendResetLink: "Enviar enlace de restablecimiento"
  }
} as const;
