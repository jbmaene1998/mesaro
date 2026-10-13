import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildRoleWalkthroughSteps,
  getWalkthroughCategoryLabel
} from "@/features/onboarding/roleWalkthroughSteps";
import { markStaffFirstRunDone, type WalkthroughRole } from "@/features/onboarding/staffFirstRun";
import { useI18n } from "@/i18n";

interface StaffFirstRunTourProps {
  userId: string;
  restaurantId: string;
  role: WalkthroughRole;
  onboardingIncomplete?: boolean;
  onDismiss: () => void;
}

export function StaffFirstRunTour({
  userId,
  restaurantId,
  role,
  onboardingIncomplete,
  onDismiss
}: StaffFirstRunTourProps) {
  const { locale } = useI18n();
  const chrome = CHROME[locale as keyof typeof CHROME] ?? CHROME.en;
  const steps = useMemo(
    () =>
      buildRoleWalkthroughSteps({
        role,
        locale,
        onboardingIncomplete
      }),
    [locale, onboardingIncomplete, role]
  );

  const [index, setIndex] = useState(0);
  const step = steps[index];
  const categoryLabel = getWalkthroughCategoryLabel(locale, step.category);

  const finish = () => {
    markStaffFirstRunDone(userId, restaurantId);
    onDismiss();
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>{chrome.title[role]}</CardTitle>
          <CardDescription>
            {chrome.stepOf.replace("{current}", String(index + 1)).replace("{total}", String(steps.length))}
          </CardDescription>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={finish}>
          {chrome.dismiss}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={chrome.stepOf.replace("{current}", String(index + 1)).replace("{total}", String(steps.length))}>
          {steps.map((item, stepIndex) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={stepIndex === index}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                stepIndex === index ? "bg-primary" : stepIndex < index ? "bg-primary/40" : "bg-muted-foreground/25"
              }`}
              onClick={() => setIndex(stepIndex)}
              aria-label={chrome.goToStep.replace("{n}", String(stepIndex + 1))}
            />
          ))}
        </div>

        <div className="space-y-2">
          <Badge variant="secondary">{categoryLabel}</Badge>
          <p className="text-sm font-medium">{step.title}</p>
          <p className="text-sm text-muted-foreground">{step.body}</p>
          {step.bullets.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {step.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={step.href}>{step.openLabel ?? chrome.open}</Link>
          </Button>
          {index > 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setIndex((value) => value - 1)}>
              {chrome.back}
            </Button>
          ) : null}
          {index < steps.length - 1 ? (
            <Button type="button" size="sm" onClick={() => setIndex((value) => value + 1)}>
              {chrome.next}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={finish}>
              {chrome.done}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const CHROME = {
  en: {
    title: {
      STAFF: "Your floor walkthrough",
      MANAGER: "Tables, shifts & floor walkthrough",
      OWNER: "Owner walkthrough: tables, shifts & account"
    },
    dismiss: "Skip tour",
    stepOf: "Step {current} of {total}",
    open: "Open",
    back: "Back",
    next: "Next",
    done: "Got it",
    goToStep: "Go to step {n}"
  },
  nl: {
    title: {
      STAFF: "Jouw floor-walkthrough",
      MANAGER: "Walkthrough: tafels, shifts & floor",
      OWNER: "Owner-walkthrough: tafels, shifts & account"
    },
    dismiss: "Tour overslaan",
    stepOf: "Stap {current} van {total}",
    open: "Open",
    back: "Terug",
    next: "Volgende",
    done: "Begrepen",
    goToStep: "Ga naar stap {n}"
  },
  fr: {
    title: {
      STAFF: "Votre visite de la salle",
      MANAGER: "Visite: tables, services et salle",
      OWNER: "Visite proprietaire: tables, services et compte"
    },
    dismiss: "Passer la visite",
    stepOf: "Etape {current} sur {total}",
    open: "Ouvrir",
    back: "Retour",
    next: "Suivant",
    done: "Compris",
    goToStep: "Aller a l'etape {n}"
  },
  es: {
    title: {
      STAFF: "Tu recorrido de sala",
      MANAGER: "Recorrido: mesas, turnos y sala",
      OWNER: "Recorrido owner: mesas, turnos y cuenta"
    },
    dismiss: "Saltar recorrido",
    stepOf: "Paso {current} de {total}",
    open: "Abrir",
    back: "Atras",
    next: "Siguiente",
    done: "Entendido",
    goToStep: "Ir al paso {n}"
  }
} as const;
