import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { useContext, useEffect, useMemo, useState } from "react";

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
import { getCombinations } from "@/features/tables/api";
import { durationOptionsMinutes } from "@/lib/date";
import { RestaurantContext } from "@/stores/restaurant-context";
import { showApiError, showSuccess } from "@/lib/toast";

interface WalkInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

type SelectedItem =
  | { type: "table"; id: string }
  | { type: "combination"; id: string }
  | null;

function errorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as AppError).code);
  }
  return undefined;
}

function roundUpToNextMinute(value: Date) {
  const rounded = new Date(value);
  if (rounded.getSeconds() > 0 || rounded.getMilliseconds() > 0) {
    rounded.setMinutes(rounded.getMinutes() + 1);
  }
  rounded.setSeconds(0, 0);
  return rounded;
}

export function WalkInDialog({ open, onOpenChange, onCreated }: WalkInDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const restaurantContext = useContext(RestaurantContext);
  const restaurantTimezone = restaurantContext?.currentRestaurant?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const defaultDurationMinutes = restaurantContext?.currentRestaurant?.defaultDurationMinutes ?? 90;
  const durationChoices = useMemo(() => durationOptionsMinutes(defaultDurationMinutes), [defaultDurationMinutes]);
  const [baseTime, setBaseTime] = useState<Date>(new Date());
  const [partySize, setPartySize] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(defaultDurationMinutes);
  const [notes, setNotes] = useState("");
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  const date = useMemo(() => formatInTimeZone(baseTime, restaurantTimezone, "yyyy-MM-dd"), [baseTime, restaurantTimezone]);
  const startTime = useMemo(() => formatInTimeZone(baseTime, restaurantTimezone, "HH:mm"), [baseTime, restaurantTimezone]);
  const endTime = useMemo(
    () => formatInTimeZone(addMinutes(baseTime, durationMinutes), restaurantTimezone, "HH:mm"),
    [baseTime, durationMinutes, restaurantTimezone]
  );

  const tables = useAvailableTables({
    date,
    startTime,
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

  const availableTableIds = useMemo(
    () => new Set(tables.available.map((t) => String(t.id))),
    [tables.available]
  );

  const eligibleCombinations = useMemo(
    () => (combinationsQuery.data ?? []).filter((c) => c.totalSeats >= partySize),
    [combinationsQuery.data, partySize]
  );

  const availableCombinations = useMemo(
    () => eligibleCombinations.filter((c) => c.tables.every((t) => availableTableIds.has(String(t.id)))),
    [eligibleCombinations, availableTableIds]
  );

  const unavailableCombinations = useMemo(
    () => eligibleCombinations.filter((c) => !c.tables.every((t) => availableTableIds.has(String(t.id)))),
    [eligibleCombinations, availableTableIds]
  );

  // Clear selection if selected item is no longer available
  useEffect(() => {
    if (!selectedItem) return;
    if (selectedItem.type === "table") {
      if (!tables.available.some((t) => String(t.id) === selectedItem.id)) {
        setSelectedItem(null);
      }
    } else {
      if (!availableCombinations.some((c) => c.id === selectedItem.id)) {
        setSelectedItem(null);
      }
    }
  }, [availableCombinations, selectedItem, tables.available]);

  // Freeze the walk-in clock when the dialog opens (do not reset on table refetch).
  useEffect(() => {
    if (!open) {
      return;
    }
    setBaseTime(roundUpToNextMinute(new Date()));
    setDurationMinutes(defaultDurationMinutes);
  }, [defaultDurationMinutes, open]);

  // Auto-select best fit table once when available.
  useEffect(() => {
    if (!open || selectedItem || !bestFitTable) {
      return;
    }
    setSelectedItem({ type: "table", id: String(bestFitTable.id) });
  }, [bestFitTable, open, selectedItem]);

  const createWalkInMutation = useMutation({
    mutationFn: () =>
      createWalkIn({
        guestName: guestName || copy.walkInGuest,
        guestPhone: guestPhone || undefined,
        partySize,
        date,
        time: startTime,
        durationMinutes,
        tableIds: selectedItem?.type === "table" ? [Number(selectedItem.id)] : undefined,
        combinationId: selectedItem?.type === "combination" ? Number(selectedItem.id) : undefined,
        notes: notes || undefined,
        seatImmediately: true
      }),
    onSuccess: (reservation) => {
      const tableLabel = reservation.tableLabels?.[0] ?? copy.assigned;
      showSuccess(`${copy.walkInSeatedAt} ${tableLabel}`);
      handleOpenChange(false);
      setGuestName("");
      setGuestPhone("");
      setNotes("");
      setSelectedItem(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["timeline", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", selectedRestaurantId] });
      onCreated?.();
    },
    onError: (error) => {
      const code = errorCode(error);
      if (code === "CONFLICT") {
        showApiError(error);
        void tables.refetch();
        return;
      }
      showApiError(error);
    }
  });

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setSelectedItem(null);
      setNotes("");
      setGuestName("");
      setGuestPhone("");
    }
  };

  function toggleItem(item: SelectedItem) {
    if (!item) return;
    const isSame = selectedItem?.type === item.type && selectedItem?.id === item.id;
    setSelectedItem(isSame ? null : item);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.newWalkIn}</DialogTitle>
          <DialogDescription>{copy.createAndSeat}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="walkin-party-size">{copy.partySize}</label>
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
              <input
                id="walkin-party-size"
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(event) => setPartySize(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
                className="h-11 w-20 rounded-md border border-input bg-background px-2 text-sm md:h-9"
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
            <label className="text-sm font-medium" htmlFor="walkin-duration">{copy.duration}</label>
            <Select value={String(durationMinutes)} onValueChange={(value) => setDurationMinutes(Number(value))}>
              <SelectTrigger id="walkin-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationChoices.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="walkin-guest-name">{copy.guestNameOptional}</label>
            <input
              id="walkin-guest-name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm md:h-9"
              placeholder={copy.walkInGuest}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="walkin-guest-phone">{copy.guestPhoneOptional}</label>
            <input
              id="walkin-guest-phone"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm md:h-9"
              placeholder="+1 ..."
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium">{copy.tableSelection}</label>
            <div className="max-h-52 space-y-2 overflow-auto rounded-md border p-3">
              {tables.isLoading ? <p className="text-sm text-muted-foreground">{copy.loadingTableStatus}</p> : null}

              {tables.available.map((table) => {
                const isSelected = selectedItem?.type === "table" && selectedItem.id === String(table.id);
                const isBestFit = bestFitTable ? String(bestFitTable.id) === String(table.id) : false;
                return (
                  <button
                    key={`table-${table.id}`}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md border p-2 text-left transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    onClick={() => toggleItem({ type: "table", id: String(table.id) })}
                  >
                    <span className="text-sm">
                      {table.label} ({table.seats} {copy.seats})
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">{tables.availabilityLabel(table)}</Badge>
                      {isBestFit ? <Badge className="bg-blue-100 text-blue-800">{copy.bestFit}</Badge> : null}
                      <input type="radio" readOnly checked={isSelected} className="pointer-events-none" aria-hidden />
                    </div>
                  </button>
                );
              })}

              {availableCombinations.map((combination) => {
                const isSelected = selectedItem?.type === "combination" && selectedItem.id === combination.id;
                return (
                  <button
                    key={`combination-${combination.id}`}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md border p-2 text-left transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    onClick={() => toggleItem({ type: "combination", id: combination.id })}
                  >
                    <span className="text-sm">
                      {combination.name} ({combination.totalSeats} {copy.seats})
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">{copy.available}</Badge>
                      <Badge className="bg-purple-100 text-purple-800">{copy.combination}</Badge>
                      <input type="radio" readOnly checked={isSelected} className="pointer-events-none" aria-hidden />
                    </div>
                  </button>
                );
              })}

              {tables.available.length === 0 && availableCombinations.length === 0 && !tables.isLoading ? (
                <p className="text-sm text-muted-foreground">{copy.noAvailableTables}</p>
              ) : null}

              {(tables.unavailable.length > 0 || unavailableCombinations.length > 0) ? (
                <div className="pt-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.unavailableNow}</p>
                  <div className="space-y-1">
                    {tables.unavailable.map((table) => (
                      <div key={`unavailable-table-${table.id}`} className="flex items-center justify-between rounded-md border p-2 opacity-70">
                        <span className="text-sm">
                          {table.label} ({table.seats} {copy.seats})
                        </span>
                        <Badge className="bg-zinc-200 text-zinc-800">{tables.availabilityLabel(table)}</Badge>
                      </div>
                    ))}
                    {unavailableCombinations.map((combination) => (
                      <div key={`unavailable-combination-${combination.id}`} className="flex items-center justify-between rounded-md border p-2 opacity-70">
                        <span className="text-sm">
                          {combination.name} ({combination.totalSeats} {copy.seats})
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-zinc-200 text-zinc-800">{copy.unavailable}</Badge>
                          <Badge className="bg-purple-100 text-purple-800">{copy.combination}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="walkin-notes">{copy.notesOptional}</label>
            <textarea
              id="walkin-notes"
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
            onClick={() => createWalkInMutation.mutate()}
            disabled={createWalkInMutation.isPending || !selectedItem}
          >
            {copy.seatWalkIn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const COPY = {
  en: {
    walkInGuest: "Walk-in Guest",
    assigned: "assigned",
    walkInSeatedAt: "Walk-in seated at Table",
    newWalkIn: "New Walk-in",
    createAndSeat: "Create and seat a walk-in reservation immediately.",
    partySize: "Party Size",
    decreasePartySize: "Decrease party size",
    increasePartySize: "Increase party size",
    duration: "Duration",
    combination: "Combination",
    available: "Available",
    unavailable: "Unavailable",
    guestNameOptional: "Guest Name (optional)",
    guestPhoneOptional: "Guest Phone (optional)",
    tableSelection: "Table Selection",
    loadingTableStatus: "Loading table status...",
    seats: "seats",
    bestFit: "Best fit",
    noAvailableTables: "No available tables right now.",
    unavailableNow: "Unavailable right now",
    notesOptional: "Notes (optional)",
    specialRequests: "Special requests",
    cancel: "Cancel",
    seatWalkIn: "Seat Walk-in"
  },
  nl: {
    walkInGuest: "Walk-in gast",
    assigned: "toegewezen",
    walkInSeatedAt: "Walk-in geplaatst aan tafel",
    newWalkIn: "Nieuwe walk-in",
    createAndSeat: "Maak een walk-in reservering aan en plaats direct.",
    partySize: "Groepsgrootte",
    decreasePartySize: "Verlaag groepsgrootte",
    increasePartySize: "Verhoog groepsgrootte",
    duration: "Duur",
    combination: "Combinatie",
    available: "Beschikbaar",
    unavailable: "Niet beschikbaar",
    guestNameOptional: "Gastnaam (optioneel)",
    guestPhoneOptional: "Gasttelefoon (optioneel)",
    tableSelection: "Tafelselectie",
    loadingTableStatus: "Tafelstatus laden...",
    seats: "stoelen",
    bestFit: "Beste match",
    noAvailableTables: "Geen beschikbare tafels op dit moment.",
    unavailableNow: "Nu niet beschikbaar",
    notesOptional: "Notities (optioneel)",
    specialRequests: "Speciale verzoeken",
    cancel: "Annuleren",
    seatWalkIn: "Plaats walk-in"
  },
  fr: {
    walkInGuest: "Client walk-in",
    assigned: "assignee",
    walkInSeatedAt: "Walk-in installe a la table",
    newWalkIn: "Nouveau walk-in",
    createAndSeat: "Creez et placez immediatement une reservation walk-in.",
    partySize: "Taille du groupe",
    decreasePartySize: "Reduire la taille du groupe",
    increasePartySize: "Augmenter la taille du groupe",
    duration: "Duree",
    combination: "Combinaison",
    available: "Disponible",
    unavailable: "Indisponible",
    guestNameOptional: "Nom du client (optionnel)",
    guestPhoneOptional: "Telephone du client (optionnel)",
    tableSelection: "Selection de table",
    loadingTableStatus: "Chargement du statut des tables...",
    seats: "places",
    bestFit: "Meilleur choix",
    noAvailableTables: "Aucune table disponible actuellement.",
    unavailableNow: "Indisponible maintenant",
    notesOptional: "Notes (optionnel)",
    specialRequests: "Demandes speciales",
    cancel: "Annuler",
    seatWalkIn: "Placer le walk-in"
  },
  es: {
    walkInGuest: "Cliente walk-in",
    assigned: "asignada",
    walkInSeatedAt: "Walk-in sentado en mesa",
    newWalkIn: "Nuevo walk-in",
    createAndSeat: "Crea y sienta una reserva walk-in de inmediato.",
    partySize: "Tamano del grupo",
    decreasePartySize: "Disminuir tamano del grupo",
    increasePartySize: "Aumentar tamano del grupo",
    duration: "Duracion",
    combination: "Combinacion",
    available: "Disponible",
    unavailable: "No disponible",
    guestNameOptional: "Nombre del cliente (opcional)",
    guestPhoneOptional: "Telefono del cliente (opcional)",
    tableSelection: "Seleccion de mesa",
    loadingTableStatus: "Cargando estado de mesas...",
    seats: "asientos",
    bestFit: "Mejor opcion",
    noAvailableTables: "No hay mesas disponibles ahora.",
    unavailableNow: "No disponible ahora",
    notesOptional: "Notas (opcional)",
    specialRequests: "Solicitudes especiales",
    cancel: "Cancelar",
    seatWalkIn: "Sentar walk-in"
  }
} as const;
