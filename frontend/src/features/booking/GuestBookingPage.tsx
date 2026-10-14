import { useMutation, useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppError } from "@/api/types";
import {
  checkClosed,
  createHold,
  utcOffsetMinutesForSlot,
  getAvailability,
  getRestaurantBySlug,
  type AvailabilitySlot
} from "@/features/booking/api";
import { saveHoldSession } from "@/features/booking/holdSession";
import { TimeSlotGrid } from "@/features/booking/components/TimeSlotGrid";
import { showApiError } from "@/lib/toast";
import { useI18n } from "@/i18n";

function getDateValue(dayOffset = 0, timeZone?: string) {
  const target = addDays(new Date(), dayOffset);
  if (!timeZone) {
    return format(target, "yyyy-MM-dd");
  }
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(target);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall back to local browser timezone formatting.
  }
  return format(target, "yyyy-MM-dd");
}

function getHoldErrorMessage(error: unknown, copy: Copy) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const appError = error as AppError;
    if (appError.code === "RESTAURANT_CLOSED") {
      return copy.closedForSelectedDate;
    }
    if (appError.code === "CAPACITY_EXCEEDED" || appError.code === "CONFLICT") {
      return copy.slotJustFilled;
    }
    if (appError.code === "HOLD_INVALID") {
      return copy.unableReserve;
    }
  }

  return copy.unableReserve;
}

export function GuestBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();

  const [date, setDate] = useState(getDateValue());
  const [partySize, setPartySize] = useState("2");
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const hasSyncedRestaurantLocaleRef = useRef(false);

  const restaurantSlug = slug ?? "";
  const bookingBasePath = location.pathname.startsWith("/embed/") ? "/embed" : "/r";
  const numericPartySize = Number(partySize);
  const { t, locale, syncLocale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];

  const restaurantQuery = useQuery({
    queryKey: ["guest-restaurant", restaurantSlug],
    queryFn: () => getRestaurantBySlug(restaurantSlug),
    enabled: Boolean(restaurantSlug)
  });
  const maxAdvanceDays = restaurantQuery.data?.maxAdvanceDays ?? 90;
  const maxPartySize = restaurantQuery.data?.maxPartySize ?? 20;
  const restaurantTimezone = restaurantQuery.data?.timezone ?? "UTC";
  const minDate = useMemo(() => getDateValue(0, restaurantTimezone), [restaurantTimezone]);
  const maxDate = useMemo(() => getDateValue(maxAdvanceDays, restaurantTimezone), [maxAdvanceDays, restaurantTimezone]);

  const closedQuery = useQuery({
    queryKey: ["guest-closed", restaurantSlug, date],
    queryFn: () => checkClosed(restaurantSlug, date),
    enabled: Boolean(restaurantSlug && date)
  });

  const availabilityQuery = useQuery({
    queryKey: ["guest-availability", restaurantSlug, date, numericPartySize],
    queryFn: () => getAvailability(restaurantSlug, date, numericPartySize),
    enabled: Boolean(restaurantSlug && hasCheckedAvailability && !closedQuery.data?.closed)
  });

  const holdMutation = useMutation({
    mutationFn: (slot: AvailabilitySlot) =>
      createHold(
        restaurantSlug,
        date,
        slot.time,
        numericPartySize,
        utcOffsetMinutesForSlot(date, slot.time, slot.timeUtc)
      ),
    onError: async (error) => {
      const message = getHoldErrorMessage(error, copy);
      setSlotError(message);
      showApiError(error);

      if (message === copy.slotJustFilled) {
        await availabilityQuery.refetch();
      }
    }
  });

  const onCheckAvailability = () => {
    setSlotError(null);
    setHasCheckedAvailability(true);
    void availabilityQuery.refetch();
  };

  const onSelectSlot = (slot: AvailabilitySlot) => {
    setSlotError(null);
    holdMutation.mutate(slot, {
      onSuccess: (hold) => {
        const holdState = {
          expiresAt: hold.expiresAt,
          date,
          time: slot.time,
          partySize: numericPartySize,
          restaurantName: restaurantQuery.data?.name
        };
        saveHoldSession(hold.holdToken, holdState);

        navigate(`${bookingBasePath}/${restaurantSlug}/confirm/${hold.holdToken}`, {
          state: holdState
        });
      }
    });
  };

  useEffect(() => {
    if (numericPartySize > maxPartySize) {
      setPartySize(String(maxPartySize));
      setHasCheckedAvailability(false);
    }
  }, [maxPartySize, numericPartySize]);

  useEffect(() => {
    if (!date || date < minDate) {
      setDate(minDate);
      setHasCheckedAvailability(false);
    }
  }, [date, minDate]);

  useEffect(() => {
    if (hasSyncedRestaurantLocaleRef.current) {
      return;
    }

    const restaurantLocale = restaurantQuery.data?.locale?.toLowerCase() ?? "";
    if (!restaurantLocale) {
      return;
    }

    const targetLocale = restaurantLocale.startsWith("nl")
      ? "nl"
      : restaurantLocale.startsWith("fr")
        ? "fr"
        : restaurantLocale.startsWith("es")
          ? "es"
          : "en";

    hasSyncedRestaurantLocaleRef.current = true;
    if (locale === targetLocale) {
      return;
    }
    syncLocale(targetLocale);
  }, [locale, restaurantQuery.data?.locale, syncLocale]);

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{restaurantQuery.data?.name ?? restaurantSlug}</CardTitle>
          <CardDescription>{t("booking.chooseDateParty")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="booking-date" className="text-sm font-medium">
                {copy.date}
              </label>
              <input
                id="booking-date"
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(event) => {
                  setDate(event.target.value);
                  setHasCheckedAvailability(false);
                  setSlotError(null);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{copy.partySize}</p>
              <Select
                value={partySize}
                onValueChange={(value) => {
                  setPartySize(value);
                  setHasCheckedAvailability(false);
                  setSlotError(null);
                }}
              >
                <SelectTrigger aria-label={copy.partySize}>
                  <SelectValue placeholder={copy.selectPartySize} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxPartySize }, (_, index) => {
                    const size = index + 1;
                    return (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {closedQuery.data?.closed ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <p className="font-medium">{t("booking.restaurantClosed")}</p>
              <p className="mt-1">
                {copy.sorryClosedPrefix} {restaurantQuery.data?.name ?? copy.thisRestaurant} {copy.sorryClosedSuffix}
                {closedQuery.data.reason ? ` ${closedQuery.data.reason}` : ""}
              </p>
            </div>
          ) : null}

          <Button
            type="button"
            onClick={onCheckAvailability}
            disabled={Boolean(closedQuery.data?.closed) || closedQuery.isFetching}
          >
            {closedQuery.isFetching ? copy.checking : t("booking.checkAvailability")}
          </Button>
        </CardContent>
      </Card>

      {hasCheckedAvailability ? (
        <Card>
          <CardHeader>
            <CardTitle>{copy.chooseTimeSlot}</CardTitle>
            <CardDescription>
              {date} {copy.for} {numericPartySize} {numericPartySize > 1 ? copy.guests : copy.guest}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {slotError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {slotError}
              </div>
            ) : null}

            {availabilityQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {(availabilityQuery.error as unknown as AppError)?.code === "RESTAURANT_CLOSED"
                  ? copy.closedForSelectedDate
                  : copy.unableToLoadAvailability}
              </div>
            ) : null}

            {availabilityQuery.isFetching ? <p className="text-sm text-muted-foreground">{copy.loadingAvailability}</p> : null}

            {!availabilityQuery.isFetching && (availabilityQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{copy.noAvailability}</p>
            ) : null}

            {(availabilityQuery.data?.length ?? 0) > 0 ? (
              <TimeSlotGrid
                slots={availabilityQuery.data ?? []}
                onSelect={onSelectSlot}
                isLoading={holdMutation.isPending}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

const COPY = {
  en: {
    date: "Date",
    partySize: "Party Size",
    selectPartySize: "Select party size",
    thisRestaurant: "this restaurant",
    sorryClosedPrefix: "Sorry,",
    sorryClosedSuffix: "is closed on this date.",
    checking: "Checking...",
    chooseTimeSlot: "Choose a Time Slot",
    for: "for",
    guest: "guest",
    guests: "guests",
    closedForSelectedDate: "Sorry, this restaurant is closed for the selected date. Please try another date.",
    unableToLoadAvailability: "Unable to load availability. Please try again.",
    loadingAvailability: "Loading availability...",
    noAvailability: "No availability for this date. Try another date."
    ,
    slotJustFilled: "This slot was just booked. Pick another time or reduce party size.",
    unableReserve: "Unable to reserve, please try again"
  },
  nl: {
    date: "Datum",
    partySize: "Groepsgrootte",
    selectPartySize: "Kies groepsgrootte",
    thisRestaurant: "dit restaurant",
    sorryClosedPrefix: "Sorry,",
    sorryClosedSuffix: "is gesloten op deze datum.",
    checking: "Controleren...",
    chooseTimeSlot: "Kies een tijdslot",
    for: "voor",
    guest: "gast",
    guests: "gasten",
    closedForSelectedDate: "Sorry, dit restaurant is gesloten op de gekozen datum. Probeer een andere datum.",
    unableToLoadAvailability: "Kan beschikbaarheid niet laden. Probeer opnieuw.",
    loadingAvailability: "Beschikbaarheid laden...",
    noAvailability: "Geen beschikbaarheid voor deze datum. Probeer een andere datum."
    ,
    slotJustFilled: "Dit tijdslot is net volgeboekt. Kies een ander tijdstip of kleinere groep.",
    unableReserve: "Kan niet reserveren, probeer opnieuw"
  },
  fr: {
    date: "Date",
    partySize: "Taille du groupe",
    selectPartySize: "Choisir la taille du groupe",
    thisRestaurant: "ce restaurant",
    sorryClosedPrefix: "Desole,",
    sorryClosedSuffix: "est ferme a cette date.",
    checking: "Verification...",
    chooseTimeSlot: "Choisir un creneau",
    for: "pour",
    guest: "client",
    guests: "clients",
    closedForSelectedDate: "Desole, ce restaurant est ferme a la date selectionnee. Veuillez essayer une autre date.",
    unableToLoadAvailability: "Impossible de charger la disponibilite. Veuillez reessayer.",
    loadingAvailability: "Chargement des disponibilites...",
    noAvailability: "Aucune disponibilite pour cette date. Essayez une autre date."
    ,
    slotJustFilled: "Ce creneau vient d etre pris. Choisissez une autre heure ou un groupe plus petit.",
    unableReserve: "Impossible de reserver, veuillez reessayer"
  },
  es: {
    date: "Fecha",
    partySize: "Tamano del grupo",
    selectPartySize: "Selecciona tamano del grupo",
    thisRestaurant: "este restaurante",
    sorryClosedPrefix: "Lo sentimos,",
    sorryClosedSuffix: "esta cerrado en esta fecha.",
    checking: "Comprobando...",
    chooseTimeSlot: "Elige un horario",
    for: "para",
    guest: "persona",
    guests: "personas",
    closedForSelectedDate: "Lo sentimos, este restaurante esta cerrado en la fecha seleccionada. Prueba otra fecha.",
    unableToLoadAvailability: "No se puede cargar la disponibilidad. Intentalo de nuevo.",
    loadingAvailability: "Cargando disponibilidad...",
    noAvailability: "No hay disponibilidad para esta fecha. Prueba otra fecha."
    ,
    slotJustFilled: "Este horario acaba de llenarse. Elige otra hora o un grupo mas pequeno.",
    unableReserve: "No se puede reservar, intenta de nuevo"
  }
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];
