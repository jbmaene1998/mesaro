import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useMemo, useState } from "react";

import type { Reservation } from "@/api/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHasPermission, useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import {
  getReservation,
  getTableStatus,
  isTableAvailable,
  switchTables,
  tableAvailabilityLabel
} from "@/features/reservations/api";
import { normalizeLocalTime } from "@/lib/date";
import { getCombinations } from "@/features/tables/api";
import { showApiError, showSuccess } from "@/lib/toast";

interface SwitchTableDialogProps {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function SwitchTableDialog({ reservation, open, onOpenChange, onUpdated }: SwitchTableDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryClient = useQueryClient();
  const canSwitchTables = useHasPermission("switchTables");
  const selectedRestaurantId = useSelectedRestaurantId();
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [selectedCombinationId, setSelectedCombinationId] = useState<string>("");

  const endTime = useMemo(() => {
    if (!reservation.endAtUtc || !reservation.timezone) {
      return undefined;
    }
    return formatInTimeZone(new Date(reservation.endAtUtc), reservation.timezone, "HH:mm");
  }, [reservation.endAtUtc, reservation.timezone]);

  const tablesQuery = useQuery({
    queryKey: ["tables-status", selectedRestaurantId, "switch", reservation.id],
    queryFn: () =>
      getTableStatus({
        date: reservation.date,
        startTime: normalizeLocalTime(reservation.time),
        endTime
      }),
    enabled: open && canSwitchTables && Boolean(selectedRestaurantId)
  });

  const combinationsQuery = useQuery({
    queryKey: ["table-combinations", selectedRestaurantId],
    queryFn: getCombinations,
    enabled: open && canSwitchTables && Boolean(selectedRestaurantId)
  });

  const eligibleCombinations = useMemo(
    () => (combinationsQuery.data ?? []).filter((combination) => combination.totalSeats >= reservation.partySize),
    [combinationsQuery.data, reservation.partySize]
  );

  const selectedCombination = useMemo(
    () => eligibleCombinations.find((combination) => combination.id === selectedCombinationId),
    [eligibleCombinations, selectedCombinationId]
  );

  const currentTableIdSet = useMemo(() => {
    const assignedLabels = new Set(reservation.tableLabels ?? []);
    const ids = (tablesQuery.data ?? [])
      .filter((table) => assignedLabels.has(table.label))
      .map((table) => Number(table.id));
    return new Set(ids);
  }, [reservation.tableLabels, tablesQuery.data]);

  useEffect(() => {
    if (!open) {
      setSelectedTableIds([]);
      setSelectedCombinationId("");
      return;
    }

    if (selectedTableIds.length > 0 || currentTableIdSet.size === 0) {
      return;
    }

    setSelectedTableIds(Array.from(currentTableIdSet));
  }, [open, selectedTableIds.length, currentTableIdSet]);

  useEffect(() => {
    if (selectedCombinationId && !selectedCombination) {
      setSelectedCombinationId("");
    }
  }, [selectedCombination, selectedCombinationId]);

  const sortedTables = useMemo(
    () =>
      [...(tablesQuery.data ?? [])].sort((a, b) => {
        const aAvailable = isTableAvailable(a);
        const bAvailable = isTableAvailable(b);
        return Number(bAvailable) - Number(aAvailable);
      }),
    [tablesQuery.data]
  );

  const selectedSeats = useMemo(
    () =>
      sortedTables
        .filter((table) => selectedTableIds.includes(Number(table.id)))
        .reduce((total, table) => total + table.seats, 0),
    [sortedTables, selectedTableIds]
  );

  const hasEnoughSeats = selectedSeats >= reservation.partySize;

  const switchMutation = useMutation({
    mutationFn: async () => {
      const current = await getReservation(reservation.id);
      return switchTables(reservation.id, {
        tableIds: selectedCombinationId ? undefined : selectedTableIds,
        combinationId: selectedCombinationId ? Number(selectedCombinationId) : undefined
      }, current.etag);
    },
    onSuccess: () => {
      const selectedTableLabels = sortedTables
        .filter((table) => selectedTableIds.includes(Number(table.id)))
        .map((table) => table.label);
      const targetLabel = selectedTableLabels.join(", ") || copy.newTable;
      showSuccess(`${copy.tableSwitchedTo} ${targetLabel}`);
      onOpenChange(false);
      setSelectedTableIds([]);
      onUpdated?.();
      void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["timeline", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  if (!canSwitchTables) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.currentAssignment}: {reservation.tableLabels?.length ? reservation.tableLabels.join(", ") : copy.unassigned}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-2 overflow-auto rounded-md border p-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">{copy.combinationOptional}</p>
            <Select
              value={selectedCombinationId}
              onValueChange={(value) => {
                setSelectedCombinationId(value === "__none__" ? "" : value);
                if (value !== "__none__") {
                  setSelectedTableIds([]);
                }
              }}
            >
              <SelectTrigger>
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

          {sortedTables.map((table) => {
            const isSelected = selectedTableIds.includes(Number(table.id));
            const isAvailable = isTableAvailable(table);
            const isCurrentTable = currentTableIdSet.has(Number(table.id));
            const isSelectable = isAvailable || isCurrentTable;
            const fitsParty = table.seats >= reservation.partySize;
            return (
              <label
                key={table.id}
                className={`flex items-center justify-between gap-3 rounded-md border p-2 ${isSelectable ? "" : "opacity-50"} ${isSelected ? "border-primary bg-primary/5" : ""}`}
              >
                <span className="text-sm">
                  {table.label} ({table.seats} seats)
                </span>
                <div className="flex items-center gap-2">
                  {fitsParty ? <Badge className="bg-green-100 text-green-800">{copy.fits}</Badge> : null}
                  <Badge className={isSelectable ? "bg-green-100 text-green-800" : "bg-zinc-200 text-zinc-800"}>
                    {isCurrentTable ? copy.current : tableAvailabilityLabel(table)}
                  </Badge>
                  <input
                    type="checkbox"
                    disabled={!isSelectable || Boolean(selectedCombinationId)}
                    checked={isSelected}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedTableIds((current) => [...current, Number(table.id)]);
                      } else {
                        setSelectedTableIds((current) =>
                          current.filter((value) => value !== Number(table.id))
                        );
                      }
                    }}
                  />
                </div>
              </label>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          {copy.selectedSeats}: {selectedSeats} / {reservation.partySize}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            onClick={() => switchMutation.mutate()}
            disabled={
              switchMutation.isPending ||
              (!selectedCombination && (selectedTableIds.length === 0 || !hasEnoughSeats))
            }
          >
            {copy.confirmSwitch}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const COPY = {
  en: {
    newTable: "new table",
    tableSwitchedTo: "Table switched to",
    title: "Switch Table",
    currentAssignment: "Current assignment",
    unassigned: "Unassigned",
    current: "Current",
    fits: "Fits",
    selectedSeats: "Selected seats",
    seats: "seats",
    combinationOptional: "Table Combination (optional)",
    none: "None",
    cancel: "Cancel",
    confirmSwitch: "Confirm Switch"
  },
  nl: {
    newTable: "nieuwe tafel",
    tableSwitchedTo: "Tafel gewisseld naar",
    title: "Tafel wisselen",
    currentAssignment: "Huidige toewijzing",
    unassigned: "Niet toegewezen",
    current: "Huidig",
    fits: "Past",
    selectedSeats: "Geselecteerde plaatsen",
    seats: "stoelen",
    combinationOptional: "Tafelcombinatie (optioneel)",
    none: "Geen",
    cancel: "Annuleren",
    confirmSwitch: "Wissel bevestigen"
  },
  fr: {
    newTable: "nouvelle table",
    tableSwitchedTo: "Table changee vers",
    title: "Changer de table",
    currentAssignment: "Affectation actuelle",
    unassigned: "Non assignee",
    current: "Actuelle",
    fits: "Compatible",
    selectedSeats: "Places selectionnees",
    seats: "places",
    combinationOptional: "Combinaison de tables (optionnel)",
    none: "Aucune",
    cancel: "Annuler",
    confirmSwitch: "Confirmer le changement"
  },
  es: {
    newTable: "mesa nueva",
    tableSwitchedTo: "Mesa cambiada a",
    title: "Cambiar mesa",
    currentAssignment: "Asignacion actual",
    unassigned: "Sin asignar",
    current: "Actual",
    fits: "Encaja",
    selectedSeats: "Asientos seleccionados",
    seats: "asientos",
    combinationOptional: "Combinacion de mesas (opcional)",
    none: "Ninguna",
    cancel: "Cancelar",
    confirmSwitch: "Confirmar cambio"
  }
} as const;
