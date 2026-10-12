import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { useAuth, useSelectedRestaurantId } from "@/hooks/use-auth";
import { getRestaurantDetails } from "@/features/settings/api";
import { getShifts } from "@/features/shifts/api";
import { getStaff } from "@/features/staff/api";
import { getTables } from "@/features/tables/api";
import { useI18n } from "@/i18n";

export interface OnboardingStep {
  id: "tables" | "shifts" | "staff" | "booking";
  title: string;
  description?: string;
  optional?: boolean;
  isComplete: boolean;
  status: "done" | "in_progress" | "not_started";
  linkLabel: string;
  linkTo: string;
}

export function useOnboardingStatus(enabled = true) {
  const { locale } = useI18n();
  const { user } = useAuth();
  const selectedRestaurantId = useSelectedRestaurantId();
  const copy = {
    en: {
      tablesTitle: "Tables configured",
      tablesDescription: "Map your floor so reservations can be assigned automatically.",
      tablesLink: "Add your first table",
      shiftsTitle: "Shifts configured",
      shiftsDescription: "Create at least one active shift with covers and service windows.",
      shiftsLink: "Set up shifts",
      staffTitle: "Staff invited",
      staffDescription: "Invite at least one teammate so service is not blocked on one account.",
      optional: "Optional",
      staffLink: "Invite team members",
      bookingTitle: "Booking enabled",
      bookingDescription: "Enable online bookings so guests can reserve directly.",
      bookingLink: "Enable online booking"
    },
    nl: {
      tablesTitle: "Tafels geconfigureerd",
      tablesDescription: "Zet je zaalindeling op zodat reserveringen automatisch toegewezen worden.",
      tablesLink: "Voeg je eerste tafel toe",
      shiftsTitle: "Shifts geconfigureerd",
      shiftsDescription: "Maak minstens een actieve shift met capaciteit en servicevensters.",
      shiftsLink: "Stel shifts in",
      staffTitle: "Personeel uitgenodigd",
      staffDescription: "Nodig minstens een teamlid uit zodat service niet op een account steunt.",
      optional: "Optioneel",
      staffLink: "Nodig teamleden uit",
      bookingTitle: "Boeking ingeschakeld",
      bookingDescription: "Schakel online boeking in zodat gasten direct kunnen reserveren.",
      bookingLink: "Schakel online boeking in"
    },
    fr: {
      tablesTitle: "Tables configurees",
      tablesDescription: "Mappez votre salle pour attribuer les reservations automatiquement.",
      tablesLink: "Ajouter votre premiere table",
      shiftsTitle: "Services configures",
      shiftsDescription: "Creez au moins un service actif avec capacite et plages horaires.",
      shiftsLink: "Configurer les services",
      staffTitle: "Personnel invite",
      staffDescription: "Invitez au moins un collaborateur pour ne pas dependre d un seul compte.",
      optional: "Optionnel",
      staffLink: "Inviter des membres",
      bookingTitle: "Reservation activee",
      bookingDescription: "Activez la reservation en ligne pour recevoir des reservations directes.",
      bookingLink: "Activer la reservation en ligne"
    },
    es: {
      tablesTitle: "Mesas configuradas",
      tablesDescription: "Configura el plano para asignar reservas automaticamente.",
      tablesLink: "Agrega tu primera mesa",
      shiftsTitle: "Turnos configurados",
      shiftsDescription: "Crea al menos un turno activo con capacidad y franjas de servicio.",
      shiftsLink: "Configurar turnos",
      staffTitle: "Personal invitado",
      staffDescription: "Invita al menos a un miembro para no depender de una sola cuenta.",
      optional: "Opcional",
      staffLink: "Invitar equipo",
      bookingTitle: "Reservas habilitadas",
      bookingDescription: "Activa reservas online para recibir reservas directas.",
      bookingLink: "Habilitar reservas online"
    }
  }[locale];

  const queryResults = useQueries({
    queries: [
      {
        queryKey: ["tables", selectedRestaurantId],
        queryFn: getTables,
        enabled: enabled && Boolean(selectedRestaurantId)
      },
      {
        queryKey: ["shifts", selectedRestaurantId],
        queryFn: getShifts,
        enabled: enabled && Boolean(selectedRestaurantId)
      },
      {
        queryKey: ["staff", selectedRestaurantId],
        queryFn: getStaff,
        enabled: enabled && Boolean(selectedRestaurantId)
      },
      {
        queryKey: ["restaurant-details", selectedRestaurantId],
        queryFn: getRestaurantDetails,
        enabled: enabled && Boolean(selectedRestaurantId)
      }
    ]
  });
  const [tablesQuery, shiftsQuery, staffQuery, restaurantQuery] = queryResults;

  const steps = useMemo<OnboardingStep[]>(() => {
    const tableCount = tablesQuery.data?.length ?? 0;
    const shiftCount = shiftsQuery.data?.length ?? 0;
    const activeShiftCount = (shiftsQuery.data ?? []).filter((shift) => shift.status === "ACTIVE").length;
    const staffCount = staffQuery.data?.length ?? 0;

    const otherStaffCount = (staffQuery.data ?? [])
      .filter((member) => member.status === "ACTIVE")
      .filter((member) => {
      if (!user?.id) {
        return true;
      }
      return member.userId !== user.id;
    }).length;

    const bookingEnabled = restaurantQuery.data?.bookingEnabled === true;

    return [
      {
        id: "tables",
        title: copy.tablesTitle,
        description: copy.tablesDescription,
        isComplete: tableCount >= 1,
        status: tableCount >= 1 ? "done" : "not_started",
        linkLabel: copy.tablesLink,
        linkTo: "/tables"
      },
      {
        id: "shifts",
        title: copy.shiftsTitle,
        description: copy.shiftsDescription,
        isComplete: activeShiftCount >= 1,
        status: activeShiftCount >= 1 ? "done" : shiftCount > 0 ? "in_progress" : "not_started",
        linkLabel: copy.shiftsLink,
        linkTo: "/shifts"
      },
      {
        id: "staff",
        title: copy.staffTitle,
        description: `${copy.staffDescription} ${copy.optional}.`,
        optional: true,
        isComplete: otherStaffCount >= 1,
        status: otherStaffCount >= 1 ? "done" : staffCount > 0 ? "in_progress" : "not_started",
        linkLabel: copy.staffLink,
        linkTo: "/staff"
      },
      {
        id: "booking",
        title: copy.bookingTitle,
        description: copy.bookingDescription,
        isComplete: bookingEnabled,
        status: bookingEnabled ? "done" : "not_started",
        linkLabel: copy.bookingLink,
        linkTo: "/settings"
      }
    ];
  }, [copy.bookingDescription, copy.bookingLink, copy.bookingTitle, copy.optional, copy.shiftsDescription, copy.shiftsLink, copy.shiftsTitle, copy.staffDescription, copy.staffLink, copy.staffTitle, copy.tablesDescription, copy.tablesLink, copy.tablesTitle, restaurantQuery.data?.bookingEnabled, shiftsQuery.data, staffQuery.data, tablesQuery.data, user?.id]);

  const requiredSteps = steps.filter((step) => !step.optional);
  const optionalSteps = steps.filter((step) => step.optional);
  const completedCount = requiredSteps.filter((step) => step.isComplete).length;
  const totalCount = requiredSteps.length;
  const isComplete = requiredSteps.every((step) => step.isComplete);
  const nextStep = requiredSteps.find((step) => !step.isComplete) ?? optionalSteps.find((step) => !step.isComplete) ?? null;
  const isLoading = enabled && queryResults.some((query) => query.isLoading);
  const hasError = enabled && queryResults.some((query) => query.isError);

  return {
    steps,
    requiredSteps,
    optionalSteps,
    nextStep,
    completedCount,
    totalCount,
    isComplete,
    isLoading,
    hasError
  };
}
