import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMinutes, format, getDay, parse } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import type { AppError } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { createWalkIn } from "@/features/reservations/api";
import { useAvailableTables } from "@/features/reservations/hooks/useAvailableTables";
import { getShifts } from "@/features/shifts/api";
import { getCombinations } from "@/features/tables/api";
import { isTimeWithinRange, normalizeLocalTime } from "@/lib/date";
import { showApiError, showSuccess } from "@/lib/toast";

interface ManualReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function roundToNextQuarterHour(value: Date) {
  const rounded = new Date(value);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 15;
  if (remainder !== 0) {
    rounded.setMinutes(minutes + (15 - remainder));
  }
  return rounded;
}

function errorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as AppError).code);
  }
  return undefined;
}

export function ManualReservationDialog({ open, onOpenChange, onCreated }: ManualReservationDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const [partySize, setPartySize] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<60 | 90 | 120>(90);
  const [notes, setNotes] = useState("");
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedCombinationId, setSelectedCombinationId] = useState<string>("");
  const [tablesBeforeCombination, setTablesBeforeCombination] = useState<string[]>([]);
  const [reservationDate, setReservationDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reservationTime, setReservationTime] = useState(format(roundToNextQuarterHour(new Date()), "HH:mm"));
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [conflictGuidance, setConflictGuidance] = useState<string | null>(null);

  const shiftsQuery = useQuery({
    queryKey: ["shifts", selectedRestaurantId],
    queryFn: getShifts,
    enabled: open && Boolean(selectedRestaurantId)
  });

  const dayOfWeek = useMemo(() => {
    const parsed = parse(`${reservationDate} 12:00`, "yyyy-MM-dd HH:mm", new Date());
    const jsDay = getDay(parsed);
    return jsDay === 0 ? 7 : jsDay;
  }, [reservationDate]);

  const activeShifts = useMemo(
    () =>
      (shiftsQuery.data ?? []).filter((shift) => shift.status === "ACTIVE" && shift.dayOfWeek === dayOfWeek),
    [dayOfWeek, shiftsQuery.data]
  );

  const selectedShift = useMemo(
    () => activeShifts.find((shift) => shift.id === selectedShiftId) ?? null,
    [activeShifts, selectedShiftId]
  );

  const isTimeWithinShift = useMemo(() => {
    if (!selectedShift) {
      return false;
    }
    return isTimeWithinRange(reservationTime, selectedShift.startTime, selectedShift.endTime);
  }, [reservationTime, selectedShift]);

  const endTime = useMemo(() => {
    const parsed = parse(`${reservationDate} ${reservationTime}`, "yyyy-MM-dd HH:mm", new Date());
    return format(addMinutes(parsed, durationMinutes), "HH:mm");
  }, [durationMinutes, reservationDate, reservationTime]);

  const tables = useAvailableTables({
    date: reservationDate,
    startTime: reservationTime,
    endTime,
    partySize,
    enabled: open
  });

  const bestFitTable = useMemo(() => tables.available.find((table) => table.seats >= partySize), [partySize, tables.available]);

  const combinationsQuery = useQuery({
    queryKey: ["table-combinations", selectedRestaurantId],
    queryFn: getCombinations,
    enabled: open && Boolean(selectedRestaurantId)
  });

  const eligibleCombinations = useMemo(
    () => (combinationsQuery.data ?? []).filter((combination) => combination.totalSeats >= partySize),
    [combinationsQuery.data, partySize]
  );

  const selectedCombination = useMemo(
    () => eligibleCombinations.find((combination) => combination.id === selectedCombinationId),
    [eligibleCombinations, selectedCombinationId]
  );

  useEffect(() => {
    if (selectedCombinationId && !selectedCombination) {
      setSelectedCombinationId("");
    }
  }, [selectedCombination, selectedCombinationId]);

  useEffect(() => {
    if (!open || !shiftsQuery.data) {
      return;
    }
    if (activeShifts.length === 0) {
      setSelectedShiftId("");
      // Jump to the next day that has an active shift (demo Sundays used to have none).
      const today = parse(`${reservationDate} 12:00`, "yyyy-MM-dd HH:mm", new Date());
      for (let offset = 1; offset <= 7; offset += 1) {
        const candidate = addDays(today, offset);
        const candidateKey = format(candidate, "yyyy-MM-dd");
        const jsDay = getDay(candidate);
        const isoDow = jsDay === 0 ? 7 : jsDay;
        const hasShift = shiftsQuery.data.some(
          (shift) => shift.status === "ACTIVE" && shift.dayOfWeek === isoDow
        );
        if (hasShift) {
          setReservationDate(candidateKey);
          break;
        }
      }
      return;
    }

    const hasExisting = activeShifts.some((shift) => shift.id === selectedShiftId);
    if (!hasExisting) {
      const nextShift = activeShifts[0];
      setSelectedShiftId(nextShift.id);
      setReservationTime(normalizeLocalTime(nextShift.startTime));
    }
  }, [activeShifts, open, reservationDate, selectedShiftId, shiftsQuery.data]);

  useEffect(() => {
    if (!open || !selectedShift) {
      return;
    }
    if (bestFitTable && selectedTableIds.length === 0) {
      setSelectedTableIds([String(bestFitTable.id)]);
    }
  }, [bestFitTable, open, selectedShift, selectedTableIds.length]);

  const createReservationMutation = useMutation({
    mutationFn: () =>
      createWalkIn({
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        partySize,
        date: reservationDate,
        time: normalizeLocalTime(reservationTime),
        durationMinutes,
        tableIds: selectedCombinationId ? undefined : selectedTableIds.map((id) => Number(id)),
        combinationId: selectedCombinationId ? Number(selectedCombinationId) : undefined,
        notes: notes.trim() || undefined,
        seatImmediately: false
      }),
    onSuccess: (reservation) => {
      showSuccess(`${copy.reservation} ${reservation.confirmationCode} ${copy.created}`);
      handleOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["timeline", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-upcoming", selectedRestaurantId] });
      onCreated?.();
    },
    onError: (error) => {
      const code = errorCode(error);
      if (code === "CONFLICT") {
        setConflictGuidance(copy.conflictGuidance);
        showApiError(error);
        void tables.refetch();
        return;
      }
      setConflictGuidance(null);
      showApiError(error);
    }
  });

  const resetForm = () => {
    const now = new Date();
    setPartySize(2);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setDurationMinutes(90);
    setNotes("");
    setSelectedTableIds([]);
    setSelectedCombinationId("");
    setTablesBeforeCombination([]);
    setReservationDate(format(now, "yyyy-MM-dd"));
    setReservationTime(format(roundToNextQuarterHour(now), "HH:mm"));
    setSelectedShiftId("");
    setConflictGuidance(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.newReservation}</DialogTitle>
          <DialogDescription>{copy.createWithoutSeating}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="manual-reservation-date">{copy.date}</label>
            <Input
              id="manual-reservation-date"
              type="date"
              value={reservationDate}
              onChange={(event) => setReservationDate(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="manual-shift">{copy.shift}</label>
            <Select
              value={selectedShiftId}
              onValueChange={(value) => {
                setSelectedShiftId(value);
                const shift = activeShifts.find((item) => item.id === value);
                if (shift) {
                  setReservationTime(normalizeLocalTime(shift.startTime));
                  setSelectedTableIds([]);
                }
              }}
              disabled={activeShifts.length === 0 || shiftsQuery.isLoading}
            >
              <SelectTrigger id="manual-shift">
                <SelectValue placeholder={shiftsQuery.isLoading ? copy.loadingShifts : copy.selectShift} />
              </SelectTrigger>
              <SelectContent>
                {activeShifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name} ({normalizeLocalTime(shift.startTime)} - {normalizeLocalTime(shift.endTime)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeShifts.length === 0 && !shiftsQuery.isLoading ? (
              <p className="text-xs text-destructive">{copy.noActiveShiftForDate}</p>
            ) : null}
            {shiftsQuery.isError ? (
              <p className="text-xs text-destructive">{copy.unableToLoadShifts}</p>
            ) : null}
            {activeShifts.length > 0 ? (
              <p className="text-xs text-muted-foreground">{copy.onlyActiveShifts}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="manual-reservation-time">{copy.time}</label>
            <Input
              id="manual-reservation-time"
              type="time"
              value={reservationTime}
              onChange={(event) => setReservationTime(event.target.value)}
              disabled={!selectedShiftId}
            />
            {selectedShift && !isTimeWithinShift ? (
              <p className="text-xs text-destructive">
                {copy.timeWithinShift} {selectedShift.startTime} - {selectedShift.endTime}.
              </p>
            ) : null}
            {!selectedShift && selectedShiftId ? (
              <p className="text-xs text-destructive">{copy.selectedShiftUnavailable}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="manual-party-size">{copy.partySize}</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={copy.decreasePartySize}
                onClick={() => setPartySize((value) => Math.max(1, value - 1))}
              >
                -
              </Button>
              <Input
                id="manual-party-size"
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(event) => setPartySize(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
                className="w-20"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={copy.increasePartySize}
                onClick={() => setPartySize((value) => Math.min(20, value + 1))}
              >
                +
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="manual-duration">{copy.duration}</label>
            <Select
              value={String(durationMinutes)}
              onValueChange={(value) => {
                const nextDuration = Number(value);
                if (nextDuration === 60 || nextDuration === 90 || nextDuration === 120) {
                  setDurationMinutes(nextDuration);
                }
              }}
            >
              <SelectTrigger id="manual-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60 min</SelectItem>
                <SelectItem value="90">90 min</SelectItem>
                <SelectItem value="120">120 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="manual-guest-name">{copy.guestName}</label>
            <Input
              id="manual-guest-name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder={copy.required}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="manual-guest-email">{copy.guestEmailOptional}</label>
            <Input
              id="manual-guest-email"
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
              placeholder="guest@example.com"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="manual-guest-phone">{copy.guestPhoneOptional}</label>
            <Input
              id="manual-guest-phone"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
              placeholder="+1 ..."
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="manual-combination">{copy.combinationOptional}</label>
            <Select
              value={selectedCombinationId}
              onValueChange={(value) => {
                if (value === "__none__") {
                  setSelectedCombinationId("");
                  if (tablesBeforeCombination.length > 0) {
                    setSelectedTableIds(tablesBeforeCombination);
                  }
                } else {
                  if (!selectedCombinationId) {
                    setTablesBeforeCombination(selectedTableIds);
                  }
                  setSelectedCombinationId(value);
                  setSelectedTableIds([]);
                }
              }}
            >
              <SelectTrigger id="manual-combination">
                <SelectValue placeholder={copy.none} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{copy.none}</SelectItem>
                {eligibleCombinations.map((combination) => (
                  <SelectItem key={combination.id} value={combination.id}>
                    {combination.name} ({combination.totalSeats} {copy.seats})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium">{copy.tableSelection}</label>
            {conflictGuidance ? (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {conflictGuidance}
              </p>
            ) : null}
            <div className="max-h-52 space-y-2 overflow-auto rounded-md border p-3">
              {tables.isLoading ? <p className="text-sm text-muted-foreground">{copy.loadingTableStatus}</p> : null}
              {tables.available.map((table) => {
                const selected = selectedTableIds.includes(String(table.id));
                const isBestFit = bestFitTable ? String(bestFitTable.id) === String(table.id) : false;
                return (
                  <label
                    key={table.id}
                    className={`flex items-center justify-between rounded-md border p-2 ${selected ? "border-primary bg-primary/5" : ""}`}
                  >
                    <span className="text-sm">
                      {table.label} ({table.seats} {copy.seats})
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">{tables.availabilityLabel(table)}</Badge>
                      {isBestFit ? <Badge className="bg-blue-100 text-blue-800">{copy.bestFit}</Badge> : null}
                      <input
                        type="checkbox"
                        disabled={Boolean(selectedCombinationId)}
                        checked={selected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedTableIds((current) => [...current, String(table.id)]);
                          } else {
                            setSelectedTableIds((current) => current.filter((value) => value !== String(table.id)));
                          }
                        }}
                      />
                    </div>
                  </label>
                );
              })}
              {tables.available.length === 0 && !tables.isLoading ? (
                <p className="text-sm text-muted-foreground">{copy.noAvailableForTime}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="manual-notes">{copy.notesOptional}</label>
            <textarea
              id="manual-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={copy.specialRequests}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            onClick={() => createReservationMutation.mutate()}
            disabled={
              createReservationMutation.isPending ||
              !guestName.trim() ||
              !selectedShiftId ||
              !isTimeWithinShift ||
              !reservationDate ||
              !reservationTime ||
              (!selectedCombinationId && selectedTableIds.length === 0)
            }
          >
            {copy.createReservation}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const COPY = {
  en: {
    reservation: "Reservation",
    created: "created",
    newReservation: "New Reservation",
    createWithoutSeating: "Create a reservation without seating guests yet.",
    date: "Date",
    shift: "Shift",
    loadingShifts: "Loading shifts...",
    selectShift: "Select shift",
    noActiveShiftForDate: "No active shift for this date. Create/activate one first.",
    onlyActiveShifts: "Only Active shifts are shown. Draft shifts must be published before booking.",
    unableToLoadShifts: "Unable to load shifts. Please try again.",
    selectedShiftUnavailable: "Selected shift is no longer available. Please reselect.",
    time: "Time",
    timeWithinShift: "Time must be within",
    partySize: "Party Size",
    decreasePartySize: "Decrease party size",
    increasePartySize: "Increase party size",
    duration: "Duration",
    combinationOptional: "Table Combination (optional)",
    none: "None",
    guestName: "Guest Name",
    required: "Required",
    guestEmailOptional: "Guest Email (optional)",
    guestPhoneOptional: "Guest Phone (optional)",
    tableSelection: "Table Selection",
    loadingTableStatus: "Loading table status...",
    seats: "seats",
    bestFit: "Best fit",
    noAvailableForTime: "No available tables for the selected time.",
    conflictGuidance: "Availability changed while you were booking. Review refreshed tables or try another time.",
    notesOptional: "Notes (optional)",
    specialRequests: "Special requests",
    cancel: "Cancel",
    createReservation: "Create Reservation"
  },
  nl: {
    reservation: "Reservering",
    created: "aangemaakt",
    newReservation: "Nieuwe reservering",
    createWithoutSeating: "Maak een reservering aan zonder gasten direct te plaatsen.",
    date: "Datum",
    shift: "Shift",
    loadingShifts: "Shifts laden...",
    selectShift: "Selecteer shift",
    noActiveShiftForDate: "Geen actieve shift voor deze datum. Maak/activeer er eerst een.",
    onlyActiveShifts: "Alleen actieve shifts worden getoond. Publiceer conceptshifts eerst.",
    unableToLoadShifts: "Kan shifts niet laden. Probeer opnieuw.",
    selectedShiftUnavailable: "Geselecteerde shift is niet meer beschikbaar. Kies opnieuw.",
    time: "Tijd",
    timeWithinShift: "Tijd moet binnen liggen:",
    partySize: "Groepsgrootte",
    decreasePartySize: "Verlaag groepsgrootte",
    increasePartySize: "Verhoog groepsgrootte",
    duration: "Duur",
    combinationOptional: "Tafelcombinatie (optioneel)",
    none: "Geen",
    guestName: "Gastnaam",
    required: "Vereist",
    guestEmailOptional: "Gast e-mail (optioneel)",
    guestPhoneOptional: "Gast telefoon (optioneel)",
    tableSelection: "Tafelselectie",
    loadingTableStatus: "Tafelstatus laden...",
    seats: "stoelen",
    bestFit: "Beste match",
    noAvailableForTime: "Geen beschikbare tafels voor het gekozen tijdstip.",
    conflictGuidance: "Beschikbaarheid is gewijzigd tijdens boeken. Bekijk de vernieuwde tafels of kies een ander tijdstip.",
    notesOptional: "Notities (optioneel)",
    specialRequests: "Speciale verzoeken",
    cancel: "Annuleren",
    createReservation: "Reservering maken"
  },
  fr: {
    reservation: "Reservation",
    created: "cree",
    newReservation: "Nouvelle reservation",
    createWithoutSeating: "Creez une reservation sans placer les clients.",
    date: "Date",
    shift: "Service",
    loadingShifts: "Chargement des services...",
    selectShift: "Selectionner un service",
    noActiveShiftForDate: "Aucun service actif pour cette date. Creez/activez-en un d'abord.",
    onlyActiveShifts: "Seuls les services actifs sont affiches. Publiez d abord les brouillons.",
    unableToLoadShifts: "Impossible de charger les services. Reessayez.",
    selectedShiftUnavailable: "Le service selectionne n est plus disponible. Veuillez reselectionner.",
    time: "Heure",
    timeWithinShift: "L'heure doit etre entre",
    partySize: "Taille du groupe",
    decreasePartySize: "Reduire la taille du groupe",
    increasePartySize: "Augmenter la taille du groupe",
    duration: "Duree",
    combinationOptional: "Combinaison de tables (optionnel)",
    none: "Aucune",
    guestName: "Nom du client",
    required: "Requis",
    guestEmailOptional: "E-mail client (optionnel)",
    guestPhoneOptional: "Telephone client (optionnel)",
    tableSelection: "Selection de table",
    loadingTableStatus: "Chargement du statut des tables...",
    seats: "places",
    bestFit: "Meilleur choix",
    noAvailableForTime: "Aucune table disponible pour l'heure choisie.",
    conflictGuidance: "La disponibilite a change pendant la reservation. Verifiez les tables actualisees ou essayez une autre heure.",
    notesOptional: "Notes (optionnel)",
    specialRequests: "Demandes speciales",
    cancel: "Annuler",
    createReservation: "Creer la reservation"
  },
  es: {
    reservation: "Reserva",
    created: "creada",
    newReservation: "Nueva reserva",
    createWithoutSeating: "Crea una reserva sin sentar a los clientes aun.",
    date: "Fecha",
    shift: "Turno",
    loadingShifts: "Cargando turnos...",
    selectShift: "Seleccionar turno",
    noActiveShiftForDate: "No hay turno activo para esta fecha. Crea/activa uno primero.",
    onlyActiveShifts: "Solo se muestran turnos activos. Publica los borradores antes de reservar.",
    unableToLoadShifts: "No se pueden cargar los turnos. Intenta de nuevo.",
    selectedShiftUnavailable: "El turno seleccionado ya no esta disponible. Vuelve a seleccionarlo.",
    time: "Hora",
    timeWithinShift: "La hora debe estar entre",
    partySize: "Tamano del grupo",
    decreasePartySize: "Disminuir tamano del grupo",
    increasePartySize: "Aumentar tamano del grupo",
    duration: "Duracion",
    combinationOptional: "Combinacion de mesas (opcional)",
    none: "Ninguna",
    guestName: "Nombre del cliente",
    required: "Obligatorio",
    guestEmailOptional: "Correo del cliente (opcional)",
    guestPhoneOptional: "Telefono del cliente (opcional)",
    tableSelection: "Seleccion de mesa",
    loadingTableStatus: "Cargando estado de mesas...",
    seats: "asientos",
    bestFit: "Mejor opcion",
    noAvailableForTime: "No hay mesas disponibles para el horario seleccionado.",
    conflictGuidance: "La disponibilidad cambio mientras reservabas. Revisa las mesas actualizadas o elige otra hora.",
    notesOptional: "Notas (opcional)",
    specialRequests: "Solicitudes especiales",
    cancel: "Cancelar",
    createReservation: "Crear reserva"
  }
} as const;
