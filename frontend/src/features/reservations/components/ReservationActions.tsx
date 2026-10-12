import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { PermissionGate } from "@/lib/permissions";
import { getReservation, updateStatus } from "@/features/reservations/api";
import { CancelDialog } from "@/features/reservations/components/CancelDialog";
import { SeatGuestDialog } from "@/features/reservations/components/SeatGuestDialog";
import { SwitchTableDialog } from "@/features/reservations/components/SwitchTableDialog";
import { showApiError, showSuccess } from "@/lib/toast";

interface ReservationActionsProps {
  reservation: Reservation;
  onViewDetails: (reservationId: string) => void;
  onUpdated?: () => void;
}

export function ReservationActions({ reservation, onViewDetails, onUpdated }: ReservationActionsProps) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const [openSeatDialog, setOpenSeatDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openSwitchDialog, setOpenSwitchDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"complete" | "noshow" | null>(null);

  const quickActionMutation = useMutation({
    mutationFn: async (action: "complete" | "noshow") => {
      const current = await getReservation(reservation.id);
      return updateStatus(reservation.id, action, current.etag);
    },
    onSuccess: (_, action) => {
      const label = action === "complete" ? copy.completed : copy.noShowLower;
      showSuccess(`${reservation.guestName} marked as ${label}`);
      setConfirmAction(null);
      onUpdated?.();
      void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["timeline", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={copy.reservationActions}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{copy.actions}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <PermissionGate permission="viewReservations">
            <DropdownMenuItem onClick={() => onViewDetails(reservation.id)}>{copy.viewDetails}</DropdownMenuItem>
          </PermissionGate>

          {reservation.status === "CONFIRMED" ? (
            <>
              <PermissionGate permission="updateStatus">
                <DropdownMenuItem onClick={() => setOpenSeatDialog(true)}>{copy.seatGuest}</DropdownMenuItem>
              </PermissionGate>
              <PermissionGate permission="updateStatus">
                <DropdownMenuItem onClick={() => setConfirmAction("noshow")}>{copy.markNoShow}</DropdownMenuItem>
              </PermissionGate>
              <PermissionGate permission="cancelReservation">
                <DropdownMenuItem onClick={() => setOpenCancelDialog(true)}>{copy.cancel}</DropdownMenuItem>
              </PermissionGate>
              <PermissionGate permission="switchTables">
                <DropdownMenuItem onClick={() => setOpenSwitchDialog(true)}>{copy.switchTable}</DropdownMenuItem>
              </PermissionGate>
            </>
          ) : null}

          {reservation.status === "SEATED" ? (
            <>
              <PermissionGate permission="updateStatus">
                <DropdownMenuItem onClick={() => setConfirmAction("complete")}>{copy.markCompleted}</DropdownMenuItem>
              </PermissionGate>
              <PermissionGate permission="switchTables">
                <DropdownMenuItem onClick={() => setOpenSwitchDialog(true)}>{copy.switchTable}</DropdownMenuItem>
              </PermissionGate>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <SeatGuestDialog
        reservation={reservation}
        open={openSeatDialog}
        onOpenChange={setOpenSeatDialog}
        onUpdated={onUpdated}
      />

      <CancelDialog
        reservation={reservation}
        open={openCancelDialog}
        onOpenChange={setOpenCancelDialog}
        onUpdated={onUpdated}
      />

      <SwitchTableDialog
        reservation={reservation}
        open={openSwitchDialog}
        onOpenChange={setOpenSwitchDialog}
        onUpdated={onUpdated}
      />

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction === "complete" ? copy.markCompleted : copy.markNoShow}</DialogTitle>
            <DialogDescription>
              {confirmAction === "complete"
                ? `${copy.markReservationFor} ${reservation.guestName} ${copy.asCompleted}`
                : `${copy.markReservationFor} ${reservation.guestName} ${copy.asNoShow}`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              {copy.cancel}
            </Button>
            <Button
              onClick={() => {
                if (confirmAction) {
                  quickActionMutation.mutate(confirmAction);
                }
              }}
              disabled={quickActionMutation.isPending}
            >
              {copy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const COPY = {
  en: {
    completed: "completed",
    noShowLower: "no-show",
    reservationActions: "Reservation actions",
    actions: "Actions",
    viewDetails: "View Details",
    seatGuest: "Seat Guest",
    markNoShow: "Mark No-Show",
    cancel: "Cancel",
    switchTable: "Switch Table",
    markCompleted: "Mark Completed",
    markReservationFor: "Mark reservation for",
    asCompleted: "as completed?",
    asNoShow: "as no-show?",
    confirm: "Confirm"
  },
  nl: {
    completed: "afgerond",
    noShowLower: "no-show",
    reservationActions: "Reserveringsacties",
    actions: "Acties",
    viewDetails: "Details bekijken",
    seatGuest: "Gast plaatsen",
    markNoShow: "Markeer no-show",
    cancel: "Annuleren",
    switchTable: "Tafel wisselen",
    markCompleted: "Markeer afgerond",
    markReservationFor: "Markeer reservering voor",
    asCompleted: "als afgerond?",
    asNoShow: "als no-show?",
    confirm: "Bevestigen"
  },
  fr: {
    completed: "terminee",
    noShowLower: "no-show",
    reservationActions: "Actions reservation",
    actions: "Actions",
    viewDetails: "Voir les details",
    seatGuest: "Placer le client",
    markNoShow: "Marquer no-show",
    cancel: "Annuler",
    switchTable: "Changer de table",
    markCompleted: "Marquer terminee",
    markReservationFor: "Marquer la reservation de",
    asCompleted: "comme terminee ?",
    asNoShow: "comme no-show ?",
    confirm: "Confirmer"
  },
  es: {
    completed: "completada",
    noShowLower: "no-show",
    reservationActions: "Acciones de reserva",
    actions: "Acciones",
    viewDetails: "Ver detalles",
    seatGuest: "Sentar cliente",
    markNoShow: "Marcar no-show",
    cancel: "Cancelar",
    switchTable: "Cambiar mesa",
    markCompleted: "Marcar completada",
    markReservationFor: "Marcar reserva de",
    asCompleted: "como completada?",
    asNoShow: "como no-show?",
    confirm: "Confirmar"
  }
} as const;
