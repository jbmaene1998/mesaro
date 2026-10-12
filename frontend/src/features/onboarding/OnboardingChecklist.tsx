import { CheckCircle2, CircleDashed, Clock3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingStep } from "@/features/onboarding/hooks/useOnboardingStatus";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  requiredSteps: OnboardingStep[];
  optionalSteps: OnboardingStep[];
  nextStep: OnboardingStep | null;
  completedCount: number;
  totalCount: number;
  isLoading: boolean;
  hasError: boolean;
  onDismiss: () => void;
}

export function OnboardingChecklist({
  requiredSteps,
  optionalSteps,
  nextStep,
  completedCount,
  totalCount,
  isLoading,
  hasError,
  onDismiss
}: OnboardingChecklistProps) {
  const { locale } = useI18n();
  const copy = {
    en: {
      title: "Launch Checklist",
      subtitle: "Complete the essentials before going live.",
      setup: "Required setup",
      complete: "complete",
      dismiss: "Hide for now",
      required: "Required",
      optional: "Optional",
      nextUp: "Next up",
      loading: "Loading onboarding progress...",
      unavailable: "Some onboarding data could not be loaded. You can still continue setup manually.",
      completeAll: "All required setup is complete."
    },
    nl: {
      title: "Livegang-checklist",
      subtitle: "Voltooi de basis voordat je live gaat.",
      setup: "Verplichte setup",
      complete: "voltooid",
      dismiss: "Verberg voorlopig",
      required: "Verplicht",
      optional: "Optioneel",
      nextUp: "Volgende stap",
      loading: "Onboarding-voortgang wordt geladen...",
      unavailable: "Sommige onboarding-data kon niet geladen worden. Je kunt setup handmatig afronden.",
      completeAll: "Alle verplichte setup is voltooid."
    },
    fr: {
      title: "Checklist de lancement",
      subtitle: "Terminez l essentiel avant la mise en ligne.",
      setup: "Configuration requise",
      complete: "termine",
      dismiss: "Masquer pour l instant",
      required: "Obligatoire",
      optional: "Optionnel",
      nextUp: "Etape suivante",
      loading: "Chargement de la progression onboarding...",
      unavailable: "Certaines donnees onboarding sont indisponibles. Continuez la configuration manuellement.",
      completeAll: "Toute la configuration requise est terminee."
    },
    es: {
      title: "Checklist de lanzamiento",
      subtitle: "Completa lo esencial antes de salir en produccion.",
      setup: "Configuracion obligatoria",
      complete: "completado",
      dismiss: "Ocultar por ahora",
      required: "Obligatorio",
      optional: "Opcional",
      nextUp: "Siguiente paso",
      loading: "Cargando progreso de onboarding...",
      unavailable: "No se pudieron cargar algunos datos de onboarding. Puedes seguir manualmente.",
      completeAll: "Toda la configuracion obligatoria esta completa."
    }
  }[locale];
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const renderStep = (step: OnboardingStep) => (
    <div key={step.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="flex min-w-0 items-start gap-2">
        {step.isComplete ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        ) : step.status === "in_progress" ? (
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        ) : (
          <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 space-y-1">
          <p className={cn("text-sm font-medium", step.isComplete ? "text-green-700" : "text-foreground")}>
            {step.title}
          </p>
          {step.description ? <p className="text-xs text-muted-foreground">{step.description}</p> : null}
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="h-8 text-xs">
        <Link to={step.linkTo}>{step.linkLabel}</Link>
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.subtitle}</CardDescription>
          <p className="text-xs text-muted-foreground">{copy.setup}: {completedCount}/{totalCount} {copy.complete}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          {copy.dismiss}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isLoading ? <p className="text-xs text-muted-foreground">{copy.loading}</p> : null}
        {hasError ? <p className="text-xs text-destructive">{copy.unavailable}</p> : null}

        {nextStep ? (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{copy.nextUp}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">{nextStep.title}</p>
              <Button asChild size="sm">
                <Link to={nextStep.linkTo}>{nextStep.linkLabel}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium text-green-700">{copy.completeAll}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{copy.required}</Badge>
          </div>
          <div className="space-y-3">
            {requiredSteps.map(renderStep)}
          </div>
        </div>

        {optionalSteps.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{copy.optional}</Badge>
            </div>
            <div className="space-y-3">
              {optionalSteps.map(renderStep)}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
