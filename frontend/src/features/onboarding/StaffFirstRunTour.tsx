import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { markStaffFirstRunDone } from "@/features/onboarding/staffFirstRun";
import { useI18n } from "@/i18n";

interface StaffFirstRunTourProps {
  userId: string;
  restaurantId: string;
  role: "STAFF" | "MANAGER";
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
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const steps = useMemo(() => {
    const base = [
      { title: copy.step1Title, body: copy.step1Body, href: "/dashboard" },
      { title: copy.step2Title, body: copy.step2Body, href: "/reservations" },
      { title: copy.step3Title, body: copy.step3Body, href: "/vacations" }
    ];
    if (role === "MANAGER") {
      base.push({ title: copy.managerTitle, body: copy.managerBody, href: "/tables" });
      if (onboardingIncomplete) {
        base.push({ title: copy.finishSetupTitle, body: copy.finishSetupBody, href: "/onboarding" });
      }
    }
    return base;
  }, [copy, onboardingIncomplete, role]);

  const [index, setIndex] = useState(0);
  const step = steps[index];

  const finish = () => {
    markStaffFirstRunDone(userId, restaurantId);
    onDismiss();
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>
            {copy.stepOf.replace("{current}", String(index + 1)).replace("{total}", String(steps.length))}
          </CardDescription>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={finish}>
          {copy.dismiss}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">{step.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={step.href}>{copy.open}</Link>
          </Button>
          {index < steps.length - 1 ? (
            <Button type="button" size="sm" onClick={() => setIndex((value) => value + 1)}>
              {copy.next}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={finish}>
              {copy.done}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const COPY = {
  en: {
    title: "Your first day on the floor",
    dismiss: "Skip tour",
    stepOf: "Tip {current} of {total}",
    open: "Open",
    next: "Next tip",
    done: "Got it",
    step1Title: "Dashboard is who’s coming",
    step1Body: "Start here during service. You’ll see tonight’s reservations, walk-ins, and live seating.",
    step2Title: "Seat, complete, or no-show",
    step2Body: "Open a reservation to seat guests, mark them complete, or record a no-show without leaving the floor flow.",
    step3Title: "Request time off",
    step3Body: "Use Vacations to request days off. Managers approve them so the floor stays covered.",
    managerTitle: "Managers also own setup",
    managerBody: "Tables, shifts, and staff invites live under those menu items when you need to change the room.",
    finishSetupTitle: "Restaurant isn’t live yet",
    finishSetupBody: "Finish the go-live wizard so guests can book online."
  },
  nl: {
    title: "Je eerste dag op de floor",
    dismiss: "Tour overslaan",
    stepOf: "Tip {current} van {total}",
    open: "Open",
    next: "Volgende tip",
    done: "Begrepen",
    step1Title: "Dashboard = wie komt",
    step1Body: "Begin hier tijdens service. Je ziet reserveringen, walk-ins en seating.",
    step2Title: "Seat, complete of no-show",
    step2Body: "Open een reservering om gasten te seaten, af te ronden of als no-show te markeren.",
    step3Title: "Vraag verlof aan",
    step3Body: "Gebruik Vacations om vrije dagen aan te vragen.",
    managerTitle: "Managers beheren ook setup",
    managerBody: "Tafels, shifts en uitnodigingen staan in het menu.",
    finishSetupTitle: "Restaurant is nog niet live",
    finishSetupBody: "Rond de go-live wizard af zodat gasten online kunnen boeken."
  },
  fr: {
    title: "Votre premiere journee en salle",
    dismiss: "Passer la visite",
    stepOf: "Conseil {current} sur {total}",
    open: "Ouvrir",
    next: "Conseil suivant",
    done: "Compris",
    step1Title: "Le tableau de bord = qui vient",
    step1Body: "Commencez ici en service. Reservations, walk-ins et seating en direct.",
    step2Title: "Asseoir, terminer ou no-show",
    step2Body: "Ouvrez une reservation pour asseoir, terminer ou noter un no-show.",
    step3Title: "Demander un conge",
    step3Body: "Utilisez Vacations pour demander des jours off.",
    managerTitle: "Les managers gerent aussi la config",
    managerBody: "Tables, services et invitations sont dans le menu.",
    finishSetupTitle: "Le restaurant n'est pas encore en ligne",
    finishSetupBody: "Terminez l'assistant go-live pour accepter des reservations."
  },
  es: {
    title: "Tu primer dia en sala",
    dismiss: "Saltar recorrido",
    stepOf: "Consejo {current} de {total}",
    open: "Abrir",
    next: "Siguiente consejo",
    done: "Entendido",
    step1Title: "El panel = quien viene",
    step1Body: "Empieza aqui durante el servicio. Reservas, walk-ins y seating en vivo.",
    step2Title: "Sentar, completar o no-show",
    step2Body: "Abre una reserva para sentar, completar o marcar no-show.",
    step3Title: "Pedir vacaciones",
    step3Body: "Usa Vacations para pedir dias libres.",
    managerTitle: "Los managers tambien configuran",
    managerBody: "Mesas, turnos e invitaciones estan en el menu.",
    finishSetupTitle: "El restaurante aun no esta en vivo",
    finishSetupBody: "Termina el asistente go-live para aceptar reservas online."
  }
} as const;
