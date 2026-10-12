import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { useMemo, useState } from "react";

import type { Reservation } from "@/api/types";
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
import { useHasPermission, useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import {
  getReservation,
  getTableStatus,
  isTableAvailable,
  switchTables,
  updateStatus
} from "@/features/reservations/api";
import { normalizeLocalTime } from "@/lib/date";
import { showApiError, showSuccess } from "@/lib/toast";

interface SeatGuestDialogProps {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function SeatGuestDialog({ reservation, open, onOpenChange, onUpdated }: SeatGuestDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryClient = useQueryClient();
  const canSwitchTables = useHasPermission("switchTables");
  const selectedRestaurantId = useSelectedRestaurantId();
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  const endTime = useMemo(() => {
    if (!reservation.endAtUtc || !reservation.timezone) {
      return undefined;
    }
    return formatInTimeZone(new Date(reservation.endAtUtc), reservation.timezone, "HH:mm");
  }, [reservation.endAtUtc, reservation.timezone]);

  const tablesQuery = useQuery({
    queryKey: ["tables-status", selectedRestaurantId, reservation.id, endTime],
    queryFn: () =>
      getTableStatus({
        date: reservation.date,
        startTime: normalizeLocalTime(reservation.time),
        endTime
      }),
    enabled: open && canSwitchTables && Boolean(selectedRestaurantId)
  });

  const availableTables = useMemo(
    () => (tablesQuery.data ?? []).filter((table) => isTableAvailable(table)),
    [tablesQuery.data]
  );

  const seatMutation = useMutation({
    mutationFn: async () => {
      if (selectedTableId) {
        const currentForSwitch = await getReservation(reservation.id);
        await switchTables(reservation.id, { tableIds: [Number(selectedTableId)] }, currentForSwitch.etag);
      }
      const currentForStatus = await getReservation(reservation.id);
      return updateStatus(reservation.id, "seat", currentForStatus.etag);
    },
    onSuccess: () => {
      showSuccess(`${reservation.guestName} ${copy.markedSeated}`);
      onOpenChange(false);
      setSelectedTableId("");
      onUpdated?.();
      void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["timeline", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.mark} {reservation.guestName} {copy.asSeatedAt} {reservation.tableLabels?.join(", ") || copy.assignedTable}?
          </DialogDescription>
        </DialogHeader>

        {canSwitchTables ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">{copy.selectDifferentTable}</label>
            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
              <SelectTrigger>
                <SelectValue placeholder={copy.keepCurrentTable} />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map((table) => (
                  <SelectItem key={table.id} value={String(table.id)}>
                    {table.label} ({table.seats} {copy.seats}, {copy.available})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            onClick={() => seatMutation.mutate()}
            disabled={seatMutation.isPending}
          >
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const COPY = {
  en: {
    markedSeated: "marked as seated",
    title: "Seat Guest",
    mark: "Mark",
    asSeatedAt: "as seated at",
    assignedTable: "assigned table",
    selectDifferentTable: "Select different table (optional)",
    keepCurrentTable: "Keep current table assignment",
    seats: "seats",
    available: "Available",
    cancel: "Cancel",
    confirm: "Confirm"
  },
  nl: {
    markedSeated: "gemarkeerd als geplaatst",
    title: "Gast plaatsen",
    mark: "Markeer",
    asSeatedAt: "als geplaatst aan",
    assignedTable: "toegewezen tafel",
    selectDifferentTable: "Andere tafel kiezen (optioneel)",
    keepCurrentTable: "Huidige tafeltoewijzing behouden",
    seats: "stoelen",
    available: "Beschikbaar",
    cancel: "Annuleren",
    confirm: "Bevestigen"
  },
  fr: {
    markedSeated: "marque comme installe",
    title: "Placer le client",
    mark: "Marquer",
    asSeatedAt: "comme installe a",
    assignedTable: "table assignee",
    selectDifferentTable: "Choisir une autre table (optionnel)",
    keepCurrentTable: "Conserver l'affectation actuelle",
    seats: "places",
    available: "Disponible",
    cancel: "Annuler",
    confirm: "Confirmer"
  },
  es: {
    markedSeated: "marcado como sentado",
    title: "Sentar cliente",
    mark: "Marcar a",
    asSeatedAt: "como sentado en",
    assignedTable: "mesa asignada",
    selectDifferentTable: "Seleccionar otra mesa (opcional)",
    keepCurrentTable: "Mantener asignacion actual",
    seats: "asientos",
    available: "Disponible",
    cancel: "Cancelar",
    confirm: "Confirmar"
  }
} as const;
