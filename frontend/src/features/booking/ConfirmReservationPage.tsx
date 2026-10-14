import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AppError } from "@/api/types";
import { confirmHold, getRestaurantBySlug, type GuestInfo, type ReservationConfirmation } from "@/features/booking/api";
import { ReservationStatusCard } from "@/features/booking/components/ReservationStatusCard";
import { clearHoldSession, readHoldSession, saveCancelToken, type HoldSessionState } from "@/features/booking/holdSession";
import { useHoldTimer } from "@/features/booking/hooks/useHoldTimer";
import { useI18n } from "@/i18n";
import { toLocalDateTime } from "@/lib/date";
import { showApiError } from "@/lib/toast";

type HoldState = Partial<HoldSessionState>;

const guestInfoSchema = z.object({
  guestName: z.string().min(2, "Name must be at least 2 characters"),
  guestEmail: z.string().email("Enter a valid email address"),
  guestPhone: z
    .string()
    .optional()
    .refine((value) => !value || /^[+]?[\d\s()-]{6,20}$/.test(value), {
      message: "Enter a valid phone number"
    }),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional()
});

type GuestInfoFormValues = z.infer<typeof guestInfoSchema>;

function buildIcsContent(input: {
  confirmationCode: string;
  restaurantName: string;
  date: string;
  time: string;
  timezone?: string;
  partySize: number | undefined;
}) {
  const start = resolveCalendarStart(input.date, input.time, input.timezone);
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const dtStamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const dtStart = format(start, "yyyyMMdd'T'HHmmss'Z'");
  const dtEnd = format(end, "yyyyMMdd'T'HHmmss'Z'");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mesaro//Reservation//EN",
    "BEGIN:VEVENT",
    `UID:${input.confirmationCode}@mesaro.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${input.restaurantName} Reservation`,
    `DESCRIPTION:Confirmation ${input.confirmationCode}${input.partySize ? `, Party Size ${input.partySize}` : ""}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

function resolveCalendarStart(date: string, time: string, timezone?: string) {
  const localDateTime = toLocalDateTime(date, time);

  if (timezone) {
    try {
      return fromZonedTime(localDateTime, timezone);
    } catch {
      // Fall back to browser-local interpretation when timezone parsing fails.
    }
  }

  return new Date(localDateTime);
}

function downloadIcsFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown, copy: Copy) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const appError = error as AppError;
    if (appError.code === "HOLD_EXPIRED") {
      return copy.holdExpired;
    }
    if (appError.code === "VALIDATION_ERROR") {
      return copy.validationError;
    }
  }

  if (typeof error === "object" && error !== null && "status" in error && (error as AppError).status === 0) {
    return copy.connectionLost;
  }

  return copy.unableConfirm;
}

export function ConfirmReservationPage() {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const navigate = useNavigate();
  const location = useLocation();
  const { slug, holdToken } = useParams<{ slug: string; holdToken: string }>();

  const state = (location.state ?? {}) as HoldState;
  const restaurantSlug = slug ?? "";
  const bookingBasePath = location.pathname.startsWith("/embed/") ? "/embed" : "/r";
  const token = holdToken ?? "";
  const storedState = readHoldSession(token);
  const holdState = state.expiresAt ? state : (storedState ?? state);
  const expiresAt = holdState.expiresAt ?? "";
  const hasDeterministicHold = Boolean(expiresAt);

  const [reservation, setReservation] = useState<ReservationConfirmation | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const timer = useHoldTimer(expiresAt || undefined);

  const restaurantQuery = useQuery({
    queryKey: ["guest-restaurant", restaurantSlug],
    queryFn: () => getRestaurantBySlug(restaurantSlug),
    enabled: Boolean(restaurantSlug)
  });

  const form = useForm<GuestInfoFormValues>({
    resolver: zodResolver(guestInfoSchema),
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      notes: ""
    }
  });

  const mutation = useMutation({
    mutationFn: (values: GuestInfo) => confirmHold(token, values),
    onSuccess: (data) => {
      saveCancelToken(data.confirmationCode, data.cancelToken);
      clearHoldSession(token);
      setReservation(data);
      setSubmitError(null);
    },
    onError: (error: unknown) => {
      const appError = error as unknown as AppError;
      if (appError.code === "VALIDATION_ERROR" && appError.field) {
        const field = appError.field as keyof GuestInfoFormValues;
        if (field in form.getValues()) {
          form.setError(field, { type: "server", message: appError.message });
          showApiError(error);
          return;
        }
      }

      setSubmitError(getErrorMessage(error, copy));
      showApiError(error);
    }
  });

  const onSubmit = (values: GuestInfoFormValues) => {
    setSubmitError(null);
    mutation.mutate(values);
  };

  useEffect(() => {
    if (hasDeterministicHold && timer.isExpired && !reservation) {
      const timeout = window.setTimeout(() => {
        navigate(`${bookingBasePath}/${restaurantSlug}`, { replace: true });
      }, 3000);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [bookingBasePath, hasDeterministicHold, navigate, reservation, restaurantSlug, timer.isExpired]);

  const partySize = holdState.partySize;
  const date = holdState.date;
  const time = holdState.time;
  const restaurantName = restaurantQuery.data?.name ?? holdState.restaurantName ?? restaurantSlug;

  const summaryText = useMemo(() => {
    if (!date && !time && !partySize) {
      return copy.selectedSlot;
    }
    return `${date ?? "-"} ${copy.at} ${time ?? "-"} ${copy.for} ${partySize ?? "-"} ${partySize === 1 ? copy.guest : copy.guests}`;
  }, [copy, date, partySize, time]);

  if (reservation) {
    const reservationForCard = {
      confirmationCode: reservation.confirmationCode,
      partySize: reservation.partySize,
      date: reservation.date,
      time: reservation.time,
      timezone: reservation.timezone,
      status: "CONFIRMED" as const,
      shiftName: reservation.shiftName ?? null,
      tableLabels: reservation.tableLabels ?? []
    };

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">{copy.reservationConfirmed}</CardTitle>
            <CardDescription className="text-center">{copy.confirmationEmailSoon}</CardDescription>
          </CardHeader>
        </Card>
        <ReservationStatusCard reservation={reservationForCard} />
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:justify-center">
            <Button
              type="button"
              onClick={() => {
                const ics = buildIcsContent({
                  confirmationCode: reservation.confirmationCode,
                  restaurantName,
                  date: reservation.date,
                  time: reservation.time,
                  timezone: reservation.timezone,
                  partySize: reservation.partySize
                });
                downloadIcsFile(ics, `${reservation.confirmationCode}.ics`);
              }}
            >
              {copy.addToCalendar}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{restaurantName}</CardTitle>
          <CardDescription>{copy.completeDetailsBelow}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={timer.isWarning ? "text-orange-600" : ""}>
            {copy.holdTimer}{" "}
            <span role="status" aria-live="polite" aria-atomic="true">
              {hasDeterministicHold ? timer.formattedTime : copy.timerUnknown}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasDeterministicHold && timer.isExpired ? (
            <p className="text-sm text-destructive">
              {copy.holdExpired}{" "}
              <Link className="underline underline-offset-4" to={`${bookingBasePath}/${restaurantSlug}`}>
                {copy.backToAvailability}
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {hasDeterministicHold ? copy.confirmBeforeTimeout : copy.holdRecoveredWithoutTimer}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.bookingSummary}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{summaryText}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.guestDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="guestName">
                  {copy.name}
                </label>
                <Input id="guestName" {...form.register("guestName")} />
                {form.formState.errors.guestName ? (
                  <p className="text-sm text-destructive">{form.formState.errors.guestName.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="guestEmail">
                  {copy.email}
                </label>
                <Input id="guestEmail" type="email" {...form.register("guestEmail")} />
                {form.formState.errors.guestEmail ? (
                  <p className="text-sm text-destructive">{form.formState.errors.guestEmail.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="guestPhone">
                {copy.phoneOptional}
              </label>
              <Input id="guestPhone" {...form.register("guestPhone")} />
              {form.formState.errors.guestPhone ? (
                <p className="text-sm text-destructive">{form.formState.errors.guestPhone.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="notes">
                {copy.specialRequests}
              </label>
              <textarea
                id="notes"
                rows={4}
                maxLength={500}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                {...form.register("notes")}
              />
              {form.formState.errors.notes ? (
                <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
              ) : null}
            </div>

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

            <Button type="submit" disabled={(hasDeterministicHold && timer.isExpired) || mutation.isPending} className="w-full">
              {mutation.isPending ? copy.confirming : copy.confirmReservation}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const COPY = {
  en: {
    holdExpired: "Your hold has expired. Please select a new time slot.",
    holdUnavailableTitle: "Hold session not available",
    holdUnavailableDescription: "We could not restore this reservation hold safely.",
    holdUnavailableNextStep: "Please return to availability and pick a new slot to continue.",
    validationError: "Please check your details and try again.",
    connectionLost: "Connection lost. Your hold is still active - try again.",
    unableConfirm: "Unable to confirm reservation right now. Please try again.",
    selectedSlot: "Your selected slot",
    at: "at",
    for: "for",
    guest: "guest",
    guests: "guests",
    reservationConfirmed: "Reservation Confirmed",
    confirmationEmailSoon: "You'll receive a confirmation email shortly.",
    addToCalendar: "Add to Calendar",
    completeDetailsBelow: "Complete your reservation details below.",
    holdTimer: "Hold Timer:",
    timerUnknown: "unknown",
    holdRecoveredWithoutTimer: "We restored your session without timer metadata. You can still try to confirm now.",
    backToAvailability: "Back to availability",
    confirmBeforeTimeout: "Please confirm before time runs out.",
    bookingSummary: "Booking Summary",
    guestDetails: "Guest Details",
    name: "Name",
    email: "Email",
    phoneOptional: "Phone (optional)",
    specialRequests: "Special requests / notes",
    confirming: "Confirming...",
    confirmReservation: "Confirm Reservation"
  },
  nl: {
    holdExpired: "Je hold is verlopen. Kies een nieuw tijdslot.",
    holdUnavailableTitle: "Holdsessie niet beschikbaar",
    holdUnavailableDescription: "We konden deze reserveringshold niet veilig herstellen.",
    holdUnavailableNextStep: "Ga terug naar beschikbaarheid en kies een nieuw tijdslot.",
    validationError: "Controleer je gegevens en probeer opnieuw.",
    connectionLost: "Verbinding verbroken. Je hold is nog actief - probeer opnieuw.",
    unableConfirm: "Kan reservering nu niet bevestigen. Probeer opnieuw.",
    selectedSlot: "Jouw gekozen slot",
    at: "om",
    for: "voor",
    guest: "gast",
    guests: "gasten",
    reservationConfirmed: "Reservering bevestigd",
    confirmationEmailSoon: "Je ontvangt zo een bevestigingsmail.",
    addToCalendar: "Toevoegen aan kalender",
    completeDetailsBelow: "Vul hieronder je reserveringsgegevens in.",
    holdTimer: "Hold timer:",
    timerUnknown: "onbekend",
    holdRecoveredWithoutTimer: "Je sessie is hersteld zonder timerinfo. Je kunt nu nog proberen te bevestigen.",
    backToAvailability: "Terug naar beschikbaarheid",
    confirmBeforeTimeout: "Bevestig voordat de tijd afloopt.",
    bookingSummary: "Reserveringsoverzicht",
    guestDetails: "Gastgegevens",
    name: "Naam",
    email: "E-mail",
    phoneOptional: "Telefoon (optioneel)",
    specialRequests: "Speciale verzoeken / notities",
    confirming: "Bevestigen...",
    confirmReservation: "Reservering bevestigen"
  },
  fr: {
    holdExpired: "Votre option a expire. Veuillez choisir un nouveau creneau.",
    holdUnavailableTitle: "Session d option indisponible",
    holdUnavailableDescription: "Impossible de restaurer cette option de reservation de facon fiable.",
    holdUnavailableNextStep: "Retournez a la disponibilite et choisissez un nouveau creneau.",
    validationError: "Veuillez verifier vos informations et reessayer.",
    connectionLost: "Connexion perdue. Votre option est toujours active - reessayez.",
    unableConfirm: "Impossible de confirmer la reservation pour le moment. Reessayez.",
    selectedSlot: "Votre creneau selectionne",
    at: "a",
    for: "pour",
    guest: "client",
    guests: "clients",
    reservationConfirmed: "Reservation confirmee",
    confirmationEmailSoon: "Vous recevrez bientot un e-mail de confirmation.",
    addToCalendar: "Ajouter au calendrier",
    completeDetailsBelow: "Completez vos details de reservation ci-dessous.",
    holdTimer: "Minuteur d option :",
    timerUnknown: "inconnu",
    holdRecoveredWithoutTimer: "Session restauree sans minuteur. Vous pouvez encore tenter la confirmation.",
    backToAvailability: "Retour a la disponibilite",
    confirmBeforeTimeout: "Veuillez confirmer avant la fin du temps.",
    bookingSummary: "Resume de reservation",
    guestDetails: "Details du client",
    name: "Nom",
    email: "E-mail",
    phoneOptional: "Telephone (optionnel)",
    specialRequests: "Demandes speciales / notes",
    confirming: "Confirmation...",
    confirmReservation: "Confirmer la reservation"
  },
  es: {
    holdExpired: "Tu bloqueo ha expirado. Selecciona un nuevo horario.",
    holdUnavailableTitle: "Sesion de bloqueo no disponible",
    holdUnavailableDescription: "No pudimos restaurar este bloqueo de reserva de forma segura.",
    holdUnavailableNextStep: "Vuelve a disponibilidad y elige un nuevo horario.",
    validationError: "Revisa tus datos e intentalo de nuevo.",
    connectionLost: "Conexion perdida. Tu bloqueo sigue activo - intenta de nuevo.",
    unableConfirm: "No se puede confirmar la reserva ahora. Intenta de nuevo.",
    selectedSlot: "Tu horario seleccionado",
    at: "a las",
    for: "para",
    guest: "persona",
    guests: "personas",
    reservationConfirmed: "Reserva confirmada",
    confirmationEmailSoon: "Recibiras un correo de confirmacion en breve.",
    addToCalendar: "Agregar al calendario",
    completeDetailsBelow: "Completa abajo los detalles de tu reserva.",
    holdTimer: "Temporizador de bloqueo:",
    timerUnknown: "desconocido",
    holdRecoveredWithoutTimer: "Recuperamos la sesion sin temporizador. Aun puedes intentar confirmar.",
    backToAvailability: "Volver a disponibilidad",
    confirmBeforeTimeout: "Confirma antes de que se acabe el tiempo.",
    bookingSummary: "Resumen de reserva",
    guestDetails: "Datos del cliente",
    name: "Nombre",
    email: "Correo",
    phoneOptional: "Telefono (opcional)",
    specialRequests: "Solicitudes especiales / notas",
    confirming: "Confirmando...",
    confirmReservation: "Confirmar reserva"
  }
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];
