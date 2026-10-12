import { type ErrorInfo, type ReactNode, Component } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  level?: "page" | "section";
  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  retryKey: number;
}

function safeMessage(error: Error | null) {
  if (!error) {
    return copyForCurrentLocale().pleaseTryAgain;
  }

  if (import.meta.env.PROD) {
    return copyForCurrentLocale().unexpectedError;
  }

  return error.message || copyForCurrentLocale().unexpectedErrorShort;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    retryKey: 0
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!import.meta.env.PROD) {
      console.error("ErrorBoundary caught an error", error, errorInfo);
    }
  }

  private tryAgain = () => {
    this.setState((current) => ({
      error: null,
      retryKey: current.retryKey + 1
    }));
  };

  private goToDashboard = () => {
    window.location.assign("/dashboard");
  };

  render() {
    if (this.state.error) {
      const isSection = this.props.level === "section";

      return (
        <div className={cn(isSection ? "min-h-[200px]" : "flex min-h-[60vh] items-center justify-center", this.props.className)}>
          <Card className={cn("w-full", isSection ? "" : "max-w-xl")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                {copyForCurrentLocale().somethingWentWrong}
              </CardTitle>
              <CardDescription>{safeMessage(this.state.error)}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={this.tryAgain}>{copyForCurrentLocale().tryAgain}</Button>
              <Button variant="outline" onClick={this.goToDashboard}>
                {copyForCurrentLocale().goToDashboard}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}

function copyForCurrentLocale() {
  const lang = typeof document !== "undefined" ? document.documentElement.lang.toLowerCase() : "en";
  if (lang.startsWith("nl")) return COPY.nl;
  if (lang.startsWith("fr")) return COPY.fr;
  if (lang.startsWith("es")) return COPY.es;
  return COPY.en;
}

const COPY = {
  en: {
    pleaseTryAgain: "Please try again.",
    unexpectedError: "An unexpected error occurred. Please try again.",
    unexpectedErrorShort: "Unexpected error",
    somethingWentWrong: "Something went wrong",
    tryAgain: "Try Again",
    goToDashboard: "Go to Dashboard"
  },
  nl: {
    pleaseTryAgain: "Probeer opnieuw.",
    unexpectedError: "Er is een onverwachte fout opgetreden. Probeer opnieuw.",
    unexpectedErrorShort: "Onverwachte fout",
    somethingWentWrong: "Er is iets misgegaan",
    tryAgain: "Opnieuw proberen",
    goToDashboard: "Ga naar dashboard"
  },
  fr: {
    pleaseTryAgain: "Veuillez reessayer.",
    unexpectedError: "Une erreur inattendue est survenue. Veuillez reessayer.",
    unexpectedErrorShort: "Erreur inattendue",
    somethingWentWrong: "Un probleme est survenu",
    tryAgain: "Reessayer",
    goToDashboard: "Aller au tableau de bord"
  },
  es: {
    pleaseTryAgain: "Intentalo de nuevo.",
    unexpectedError: "Ocurrio un error inesperado. Intentalo de nuevo.",
    unexpectedErrorShort: "Error inesperado",
    somethingWentWrong: "Algo salio mal",
    tryAgain: "Reintentar",
    goToDashboard: "Ir al panel"
  }
} as const;
