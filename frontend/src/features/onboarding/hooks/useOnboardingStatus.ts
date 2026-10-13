import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { useAuth, useSelectedRestaurantId } from "@/hooks/use-auth";
import { getRestaurantDetails } from "@/features/settings/api";
import { getShifts } from "@/features/shifts/api";
import { getStaff } from "@/features/staff/api";
import { getTables } from "@/features/tables/api";
import { useI18n } from "@/i18n";

export type WizardStepId =
  | "restaurant"
  | "tables"
  | "shifts"
  | "rules"
  | "booking"
  | "share"
  | "staff";

export interface OnboardingStep {
  id: WizardStepId;
  title: string;
  description?: string;
  optional?: boolean;
  isComplete: boolean;
  status: "done" | "in_progress" | "not_started";
  linkLabel: string;
  linkTo: string;
}

const SHARE_SEEN_PREFIX = "mesaro.onboarding.shareSeen.";
const RULES_SEEN_PREFIX = "mesaro.onboarding.rulesSeen.";

export function markShareStepSeen(restaurantId: string) {
  localStorage.setItem(`${SHARE_SEEN_PREFIX}${restaurantId}`, "1");
}

export function isShareStepSeen(restaurantId: string) {
  return localStorage.getItem(`${SHARE_SEEN_PREFIX}${restaurantId}`) === "1";
}

export function markRulesStepSeen(restaurantId: string) {
  localStorage.setItem(`${RULES_SEEN_PREFIX}${restaurantId}`, "1");
}

export function isRulesStepSeen(restaurantId: string) {
  return localStorage.getItem(`${RULES_SEEN_PREFIX}${restaurantId}`) === "1";
}

export function useOnboardingStatus(enabled = true) {
  const { locale } = useI18n();
  const { user } = useAuth();
  const selectedRestaurantId = useSelectedRestaurantId();
  const copy = {
    en: {
      restaurantTitle: "Restaurant created",
      restaurantDescription: "Name, booking URL, and timezone are set.",
      restaurantLink: "Edit restaurant",
      tablesTitle: "Tables configured",
      tablesDescription: "Map your floor so reservations can be assigned automatically.",
      tablesLink: "Add your first table",
      shiftsTitle: "Shifts configured",
      shiftsDescription: "Create at least one active shift with covers and service windows.",
      shiftsLink: "Set up shifts",
      rulesTitle: "Booking rules",
      rulesDescription: "Duration, party size, and how far ahead guests can book.",
      rulesLink: "Review booking rules",
      staffTitle: "Staff invited",
      staffDescription: "Invite at least one teammate so service is not blocked on one account.",
      optional: "Optional",
      staffLink: "Invite team members",
      bookingTitle: "Booking enabled",
      bookingDescription: "After tables and active shifts are set, enable online bookings so guests can reserve.",
      bookingLink: "Enable online booking",
      shareTitle: "Share booking link",
      shareDescription: "Copy your public booking link or embed snippet for your website.",
      shareLink: "Copy booking link"
    },
    nl: {
      restaurantTitle: "Restaurant aangemaakt",
      restaurantDescription: "Naam, boekings-URL en tijdzone staan klaar.",
      restaurantLink: "Bewerk restaurant",
      tablesTitle: "Tafels geconfigureerd",
      tablesDescription: "Zet je zaalindeling op zodat reserveringen automatisch toegewezen worden.",
      tablesLink: "Voeg je eerste tafel toe",
      shiftsTitle: "Shifts geconfigureerd",
      shiftsDescription: "Maak minstens een actieve shift met capaciteit en servicevensters.",
      shiftsLink: "Stel shifts in",
      rulesTitle: "Boekingsregels",
      rulesDescription: "Duur, groepsgrootte en hoe ver vooruit gasten kunnen boeken.",
      rulesLink: "Bekijk boekingsregels",
      staffTitle: "Personeel uitgenodigd",
      staffDescription: "Nodig minstens een teamlid uit zodat service niet op een account steunt.",
      optional: "Optioneel",
      staffLink: "Nodig teamleden uit",
      bookingTitle: "Boeking ingeschakeld",
      bookingDescription: "Na tafels en actieve shifts kun je online boeking inschakelen zodat gasten kunnen reserveren.",
      bookingLink: "Schakel online booking in",
      shareTitle: "Deel boekingslink",
      shareDescription: "Kopieer je publieke boekingslink of embed voor je website.",
      shareLink: "Kopieer boekingslink"
    },
    fr: {
      restaurantTitle: "Restaurant cree",
      restaurantDescription: "Nom, URL de reservation et fuseau horaire sont configures.",
      restaurantLink: "Modifier le restaurant",
      tablesTitle: "Tables configurees",
      tablesDescription: "Mappez votre salle pour attribuer les reservations automatiquement.",
      tablesLink: "Ajouter votre premiere table",
      shiftsTitle: "Services configures",
      shiftsDescription: "Creez au moins un service actif avec capacite et plages horaires.",
      shiftsLink: "Configurer les services",
      rulesTitle: "Regles de reservation",
      rulesDescription: "Duree, taille de groupe et delai de reservation.",
      rulesLink: "Voir les regles",
      staffTitle: "Personnel invite",
      staffDescription: "Invitez au moins un collaborateur pour ne pas dependre d un seul compte.",
      optional: "Optionnel",
      staffLink: "Inviter des membres",
      bookingTitle: "Reservation activee",
      bookingDescription: "Apres tables et services actifs, activez la reservation en ligne pour les clients.",
      bookingLink: "Activer la reservation en ligne",
      shareTitle: "Partager le lien",
      shareDescription: "Copiez votre lien public ou le code embed pour votre site.",
      shareLink: "Copier le lien"
    },
    es: {
      restaurantTitle: "Restaurante creado",
      restaurantDescription: "Nombre, URL de reservas y zona horaria listos.",
      restaurantLink: "Editar restaurante",
      tablesTitle: "Mesas configuradas",
      tablesDescription: "Configura el plano para asignar reservas automaticamente.",
      tablesLink: "Agrega tu primera mesa",
      shiftsTitle: "Turnos configurados",
      shiftsDescription: "Crea al menos un turno activo con capacidad y franjas de servicio.",
      shiftsLink: "Configurar turnos",
      rulesTitle: "Reglas de reserva",
      rulesDescription: "Duracion, tamano de grupo y anticipacion de reservas.",
      rulesLink: "Revisar reglas",
      staffTitle: "Personal invitado",
      staffDescription: "Invita al menos a un miembro para no depender de una sola cuenta.",
      optional: "Opcional",
      staffLink: "Invitar equipo",
      bookingTitle: "Reservas habilitadas",
      bookingDescription: "Tras mesas y turnos activos, habilita reservas online para que los clientes reserven.",
      bookingLink: "Habilitar reservas online",
      shareTitle: "Compartir enlace",
      shareDescription: "Copia tu enlace publico o el embed para tu web.",
      shareLink: "Copiar enlace"
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
    const hasRestaurant = Boolean(selectedRestaurantId);
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
    const shareSeen = selectedRestaurantId ? isShareStepSeen(selectedRestaurantId) : false;
    const rulesSeen = selectedRestaurantId ? isRulesStepSeen(selectedRestaurantId) : false;

    return [
      {
        id: "restaurant" as const,
        title: copy.restaurantTitle,
        description: copy.restaurantDescription,
        isComplete: hasRestaurant,
        status: hasRestaurant ? "done" : "not_started",
        linkLabel: copy.restaurantLink,
        linkTo: "/onboarding?step=restaurant"
      },
      {
        id: "tables" as const,
        title: copy.tablesTitle,
        description: copy.tablesDescription,
        isComplete: tableCount >= 1,
        status: tableCount >= 1 ? "done" : "not_started",
        linkLabel: copy.tablesLink,
        linkTo: "/onboarding?step=tables"
      },
      {
        id: "shifts" as const,
        title: copy.shiftsTitle,
        description: copy.shiftsDescription,
        isComplete: activeShiftCount >= 1,
        status: activeShiftCount >= 1 ? "done" : shiftCount > 0 ? "in_progress" : "not_started",
        linkLabel: copy.shiftsLink,
        linkTo: "/onboarding?step=shifts"
      },
      {
        id: "rules" as const,
        title: copy.rulesTitle,
        description: copy.rulesDescription,
        isComplete: hasRestaurant && (rulesSeen || bookingEnabled || shareSeen),
        status: hasRestaurant && (rulesSeen || bookingEnabled || shareSeen) ? "done" : hasRestaurant ? "in_progress" : "not_started",
        linkLabel: copy.rulesLink,
        linkTo: "/onboarding?step=rules"
      },
      {
        id: "booking" as const,
        title: copy.bookingTitle,
        description: copy.bookingDescription,
        isComplete: bookingEnabled,
        status: bookingEnabled ? "done" : "not_started",
        linkLabel: copy.bookingLink,
        linkTo: "/onboarding?step=booking"
      },
      {
        id: "share" as const,
        title: copy.shareTitle,
        description: copy.shareDescription,
        isComplete: bookingEnabled && shareSeen,
        status: bookingEnabled && shareSeen ? "done" : bookingEnabled ? "in_progress" : "not_started",
        linkLabel: copy.shareLink,
        linkTo: "/onboarding?step=share"
      },
      {
        id: "staff" as const,
        title: copy.staffTitle,
        description: `${copy.staffDescription} ${copy.optional}.`,
        optional: true,
        isComplete: otherStaffCount >= 1,
        status: otherStaffCount >= 1 ? "done" : staffCount > 0 ? "in_progress" : "not_started",
        linkLabel: copy.staffLink,
        linkTo: "/onboarding?step=staff"
      }
    ];
  }, [
    copy.bookingDescription,
    copy.bookingLink,
    copy.bookingTitle,
    copy.optional,
    copy.restaurantDescription,
    copy.restaurantLink,
    copy.restaurantTitle,
    copy.rulesDescription,
    copy.rulesLink,
    copy.rulesTitle,
    copy.shareDescription,
    copy.shareLink,
    copy.shareTitle,
    copy.shiftsDescription,
    copy.shiftsLink,
    copy.shiftsTitle,
    copy.staffDescription,
    copy.staffLink,
    copy.staffTitle,
    copy.tablesDescription,
    copy.tablesLink,
    copy.tablesTitle,
    restaurantQuery.data,
    selectedRestaurantId,
    shiftsQuery.data,
    staffQuery.data,
    tablesQuery.data,
    user?.id
  ]);

  const requiredSteps = steps.filter((step) => !step.optional);
  const optionalSteps = steps.filter((step) => step.optional);
  const completedCount = requiredSteps.filter((step) => step.isComplete).length;
  const totalCount = requiredSteps.length;
  const isComplete = requiredSteps.every((step) => step.isComplete);
  const isGoLiveReady =
    (tablesQuery.data?.length ?? 0) >= 1 &&
    (shiftsQuery.data ?? []).some((shift) => shift.status === "ACTIVE") &&
    restaurantQuery.data?.bookingEnabled === true;
  const nextStep = requiredSteps.find((step) => !step.isComplete) ?? optionalSteps.find((step) => !step.isComplete) ?? null;
  const wizardStepIndex = nextStep ? steps.findIndex((step) => step.id === nextStep.id) : steps.length - 1;
  const isLoading = enabled && queryResults.some((query) => query.isLoading);
  const hasError = enabled && queryResults.some((query) => query.isError);

  return {
    steps,
    requiredSteps,
    optionalSteps,
    nextStep,
    wizardStepIndex: Math.max(0, wizardStepIndex),
    completedCount,
    totalCount,
    isComplete,
    isGoLiveReady,
    isLoading,
    hasError,
    refetchAll: () => Promise.all(queryResults.map((query) => query.refetch()))
  };
}
