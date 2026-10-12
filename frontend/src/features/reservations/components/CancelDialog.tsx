import { useMutation, useQueryClient } from "@tanstack/react-query";

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
import { useHasPermission, useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { getReservation, updateStatus } from "@/features/reservations/api";
import { showApiError, showSuccess } from "@/lib/toast";

interface CancelDialogProps {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function CancelDialog({ reservation, open, onOpenChange, onUpdated }: CancelDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryClient = useQueryClient();
  const canCancel = useHasPermission("cancelReservation");
  const selectedRestaurantId = useSelectedRestaurantId();

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const current = await getReservation(reservation.id);
      return updateStatus(reservation.id, "cancel", current.etag);
    },
    onSuccess: () => {
      showSuccess(`${reservation.guestName} ${copy.markedCancelled}`);
      onOpenChange(false);
      onUpdated?.();
      void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["timeline", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  if (!canCancel) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.cancelFor} {reservation.guestName}?
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{copy.notifyByEmail}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.keepReservation}
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {copy.confirmCancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const COPY = {
  en: {
    title: "Cancel Reservation",
    cancelFor: "Cancel reservation for",
    notifyByEmail: "The guest will be notified by email.",
    keepReservation: "Keep Reservation",
    confirmCancel: "Confirm Cancel",
    markedCancelled: "marked as cancelled"
  },
  nl: {
    title: "Reservering annuleren",
    cancelFor: "Annuleer reservering voor",
    notifyByEmail: "De gast wordt per e-mail op de hoogte gebracht.",
    keepReservation: "Reservering behouden",
    confirmCancel: "Annulering bevestigen",
    markedCancelled: "gemarkeerd als geannuleerd"
  },
  fr: {
    title: "Annuler la reservation",
    cancelFor: "Annuler la reservation de",
    notifyByEmail: "Le client sera notifie par e-mail.",
    keepReservation: "Conserver la reservation",
    confirmCancel: "Confirmer l'annulation",
    markedCancelled: "marquee comme annulee"
  },
  es: {
    title: "Cancelar reserva",
    cancelFor: "Cancelar reserva de",
    notifyByEmail: "El cliente sera notificado por correo.",
    keepReservation: "Mantener reserva",
    confirmCancel: "Confirmar cancelacion",
    markedCancelled: "marcada como cancelada"
  }
} as const;
