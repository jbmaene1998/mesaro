import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resolvePostLoginRedirect } from "@/features/auth/redirect";
import { useAuth } from "@/hooks/use-auth";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { isRateLimited } from "@/lib/error-handling";
import { showApiError } from "@/lib/toast";
import { useI18n } from "@/i18n";

type LoginFormValues = {
  email: string;
  password: string;
};

function getErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function getLoginErrorMessage(error: unknown, copy: Copy) {
  if (isRateLimited(error)) {
    return copy.tooManyAttempts;
  }

  if (isAxiosError(error) && !error.response) {
    return copy.unableConnect;
  }

  const status = getErrorStatus(error);
  if (status === 0) {
    return copy.unableConnect;
  }

  if (status === 401) {
    return copy.invalidCredentials;
  }

  return copy.invalidCredentials;
}

export function LoginPage() {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const loginSchema = z.object({
    email: z.string().min(1, copy.emailRequired).email(copy.validEmail),
    password: z.string().min(1, copy.passwordRequired)
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const { errors, isSubmitting } = form.formState;
  const returnUrl = searchParams.get("returnUrl");
  const redirectPath = resolvePostLoginRedirect(returnUrl);

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN_VIEW, { page: "login" });
  }, []);

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    if (isAuthLoading) {
      return;
    }

    setSubmitError(null);
    trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN_SUBMIT, {
      page: "login",
      hasReturnUrl: Boolean(returnUrl)
    });

    try {
      await login(values.email, values.password);
      trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN_SUCCESS, { page: "login", redirectPath });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setSubmitError(getLoginErrorMessage(error, copy));
      trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN_FAILURE, { page: "login" });
      showApiError(error);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">{copy.signIn}</CardTitle>
        <CardDescription>{copy.accessAdminConsole}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit, () => {
            trackEvent(ANALYTICS_EVENTS.AUTH_LOGIN_VALIDATION_ERROR, {
              page: "login",
              errorCount: Object.keys(errors).length
            });
          })}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              {copy.email}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...form.register("email")}
            />
            {errors.email ? (
              <p id="login-email-error" className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              {copy.password}
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-11"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                {...form.register("password")}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
              <p id="login-password-error" className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>
          {submitError ? (
            <p className="text-sm text-destructive" role="alert" aria-live="assertive">
              {submitError}
            </p>
          ) : null}
          <Button className="w-full" type="submit" disabled={isSubmitting || isAuthLoading}>
            {(isSubmitting || isAuthLoading) ? copy.signingIn : copy.signIn}
          </Button>
          <div className="text-center text-sm">
            <Link to="/forgot-password" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {copy.forgotPassword}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/register">{copy.createNewUser}</Link>
            </Button>
            <Button type="button" variant="ghost" onClick={handleGoBack}>
              {copy.goBack}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const COPY = {
  en: {
    emailRequired: "Email is required",
    validEmail: "Enter a valid email address",
    passwordRequired: "Password is required",
    tooManyAttempts: "Too many login attempts. Please wait and try again.",
    unableConnect: "Unable to connect. Check your internet connection.",
    invalidCredentials: "Invalid email or password",
    signIn: "Sign In",
    signingIn: "Signing In...",
    accessAdminConsole: "Access your restaurant admin console.",
    email: "Email",
    password: "Password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    forgotPassword: "Forgot password?",
    createNewUser: "Create new user",
    goBack: "Go back"
  },
  nl: {
    emailRequired: "E-mail is verplicht",
    validEmail: "Voer een geldig e-mailadres in",
    passwordRequired: "Wachtwoord is verplicht",
    tooManyAttempts: "Te veel inlogpogingen. Wacht even en probeer opnieuw.",
    unableConnect: "Kan geen verbinding maken. Controleer je internetverbinding.",
    invalidCredentials: "Ongeldig e-mailadres of wachtwoord",
    signIn: "Inloggen",
    signingIn: "Inloggen...",
    accessAdminConsole: "Toegang tot je restaurantbeheer.",
    email: "E-mail",
    password: "Wachtwoord",
    hidePassword: "Verberg wachtwoord",
    showPassword: "Toon wachtwoord",
    forgotPassword: "Wachtwoord vergeten?",
    createNewUser: "Nieuwe gebruiker maken",
    goBack: "Ga terug"
  },
  fr: {
    emailRequired: "L e-mail est requis",
    validEmail: "Saisissez une adresse e-mail valide",
    passwordRequired: "Le mot de passe est requis",
    tooManyAttempts: "Trop de tentatives de connexion. Veuillez patienter et reessayer.",
    unableConnect: "Impossible de se connecter. Verifiez votre connexion internet.",
    invalidCredentials: "E-mail ou mot de passe invalide",
    signIn: "Se connecter",
    signingIn: "Connexion...",
    accessAdminConsole: "Accedez a la console admin de votre restaurant.",
    email: "E-mail",
    password: "Mot de passe",
    hidePassword: "Masquer le mot de passe",
    showPassword: "Afficher le mot de passe",
    forgotPassword: "Mot de passe oublie ?",
    createNewUser: "Creer un utilisateur",
    goBack: "Retour"
  },
  es: {
    emailRequired: "El correo es obligatorio",
    validEmail: "Introduce un correo valido",
    passwordRequired: "La contrasena es obligatoria",
    tooManyAttempts: "Demasiados intentos de inicio de sesion. Espera e intentalo de nuevo.",
    unableConnect: "No se puede conectar. Revisa tu conexion a internet.",
    invalidCredentials: "Correo o contrasena incorrectos",
    signIn: "Iniciar sesion",
    signingIn: "Iniciando sesion...",
    accessAdminConsole: "Accede al panel de administracion de tu restaurante.",
    email: "Correo",
    password: "Contrasena",
    hidePassword: "Ocultar contrasena",
    showPassword: "Mostrar contrasena",
    forgotPassword: "Olvidaste tu contrasena?",
    createNewUser: "Crear nuevo usuario",
    goBack: "Volver"
  }
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];
