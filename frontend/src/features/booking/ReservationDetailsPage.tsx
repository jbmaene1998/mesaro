import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import type { AppError } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import type { GuestReservation } from "@/features/booking/api";
import { cancelReservation, getReservationByCode } from "@/features/booking/api";
import { ReservationStatusCard } from "@/features/booking/components/ReservationStatusCard";
import { readCancelToken, saveCancelToken } from "@/features/booking/holdSession";
import { useI18n } from "@/i18n";

export function ReservationDetailsPage() {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const queryClient = useQueryClient();
  const location = useLocation();
  const { slug, code } = useParams<{ slug: string; code: string }>();

  const restaurantSlug = slug ?? "";
  const confirmationCode = code ?? "";
  const bookingBasePath = location.pathname.startsWith("/embed/") ? "/embed" : "/r";
  const navCancelToken = (location.state as { cancelToken?: string } | null)?.cancelToken;
  const storedCancelToken = readCancelToken(confirmationCode);
  const searchParams = new URLSearchParams(location.search);
  const queryCancelToken =
    searchParams.get("cancelToken") ?? searchParams.get("token") ?? undefined;
  const cancelToken = navCancelToken ?? storedCancelToken ?? queryCancelToken;

  useEffect(() => {
    if (confirmationCode && cancelToken) {
      saveCancelToken(confirmationCode, cancelToken);
    }
  }, [confirmationCode, cancelToken]);

  const reservationQuery = useQuery({
    queryKey: ["guest-reservation", restaurantSlug, confirmationCode, cancelToken],
    queryFn: () => getReservationByCode(confirmationCode, cancelToken ?? ""),
    enabled: Boolean(restaurantSlug && confirmationCode && cancelToken)
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelReservation(confirmationCode, cancelToken ?? ""),
    onSuccess: async (cancelledReservation) => {
      queryClient.setQueryData<GuestReservation>(
        ["guest-reservation", restaurantSlug, confirmationCode, cancelToken],
        cancelledReservation
      );
      await queryClient.invalidateQueries({
        queryKey: ["guest-reservation", restaurantSlug, confirmationCode, cancelToken]
      });
    }
  });

  const reservation = reservationQuery.data;

  return (
    <div className="w-full space-y-4">
      {reservationQuery.isLoading ? <p className="text-sm text-muted-foreground">{copy.loadingReservation}</p> : null}

      {reservationQuery.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {getReservationLoadError(reservationQuery.error, copy)}
        </p>
      ) : null}

      {!cancelToken ? (
        <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p>{copy.missingCancelToken}</p>
          <p className="text-xs text-destructive/90">{copy.missingCancelTokenHelp}</p>
          <Button asChild variant="outline" size="sm">
            <Link to={`${bookingBasePath}/${restaurantSlug}`}>{copy.backToAvailability}</Link>
          </Button>
        </div>
      ) : null}

      {reservation ? <ReservationStatusCard reservation={reservation} /> : null}

      {reservation?.status === "CANCELLED" ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {copy.reservationCancelled}
        </p>
      ) : null}

      {reservation?.status === "COMPLETED" ? (
        <p className="rounded-md border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700">
          {copy.thankYouDining}
        </p>
      ) : null}

      {reservation?.status === "CONFIRMED" && cancelToken ? (
        <CancelReservationSection
          reservation={reservation}
          onConfirm={() => cancelMutation.mutate()}
          isLoading={cancelMutation.isPending}
          isSuccess={cancelMutation.isSuccess}
          errorMessage={cancelMutation.isError ? cancelErrorMessage(cancelMutation.error, copy) : null}
          copy={copy}
        />
      ) : null}
    </div>
  );
}

function getReservationLoadError(error: unknown, copy: Copy) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const appError = error as AppError;
    if (appError.code === "NOT_FOUND") {
      return copy.reservationNotFound;
    }
    if (appError.code === "FORBIDDEN" || appError.code === "UNAUTHORIZED") {
      return copy.invalidAccessToken;
    }
  }
  return copy.unableToLoadDetails;
}

function cancelErrorMessage(error: unknown, copy: Copy) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as AppError).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return copy.unableToCancel;
}

function CancelReservationSection({
  reservation,
  onConfirm,
  isLoading,
  isSuccess,
  errorMessage,
  copy
}: {
  reservation: GuestReservation;
  onConfirm: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  errorMessage: string | null;
  copy: Copy;
}) {
  return (
    <div className="space-y-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive">{copy.cancelReservation}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.cancelReservation}</DialogTitle>
            <DialogDescription>
              {copy.confirmCancelPrompt} {reservation.confirmationCode}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                {copy.keepReservation}
              </Button>
            </DialogClose>
            <Button variant="destructive" type="button" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? copy.cancelling : copy.confirmCancellation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isSuccess ? (
        <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {copy.cancelledSuccessfully}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

const COPY = {
  en: {
    loadingReservation: "Loading reservation...",
    unableToLoadDetails: "Unable to load reservation details.",
    reservationNotFound: "Reservation not found or no longer accessible.",
    invalidAccessToken: "The reservation access token is invalid or expired.",
    missingCancelToken: "This link is missing the secure cancellation token.",
    missingCancelTokenHelp: "Open the reservation link from your confirmation email to manage this booking.",
    backToAvailability: "Back to availability",
    reservationCancelled: "This reservation has been cancelled.",
    thankYouDining: "Thank you for dining with us!",
    cancelReservation: "Cancel Reservation",
    confirmCancelPrompt: "Are you sure you want to cancel reservation",
    keepReservation: "Keep Reservation",
    cancelling: "Cancelling...",
    confirmCancellation: "Confirm Cancellation",
    cancelledSuccessfully: "Reservation cancelled successfully.",
    unableToCancel: "We could not cancel this reservation. It is still confirmed."
  },
  nl: {
    loadingReservation: "Reservering laden...",
    unableToLoadDetails: "Kan reserveringsdetails niet laden.",
    reservationNotFound: "Reservering niet gevonden of niet meer beschikbaar.",
    invalidAccessToken: "Het toegangstoken voor deze reservering is ongeldig of verlopen.",
    missingCancelToken: "Deze link mist het beveiligde annuleertoken.",
    missingCancelTokenHelp: "Open de reserveringslink vanuit je bevestigingsmail om deze boeking te beheren.",
    backToAvailability: "Terug naar beschikbaarheid",
    reservationCancelled: "Deze reservering is geannuleerd.",
    thankYouDining: "Bedankt voor je bezoek!",
    cancelReservation: "Reservering annuleren",
    confirmCancelPrompt: "Weet je zeker dat je reservering wilt annuleren",
    keepReservation: "Reservering behouden",
    cancelling: "Annuleren...",
    confirmCancellation: "Annulering bevestigen",
    cancelledSuccessfully: "Reservering succesvol geannuleerd.",
    unableToCancel: "We konden deze reservering niet annuleren. Hij staat nog bevestigd."
  },
  fr: {
    loadingReservation: "Chargement de la reservation...",
    unableToLoadDetails: "Impossible de charger les details de la reservation.",
    reservationNotFound: "Reservation introuvable ou non accessible.",
    invalidAccessToken: "Le jeton d acces de la reservation est invalide ou expire.",
    missingCancelToken: "Ce lien ne contient pas le jeton d annulation securise.",
    missingCancelTokenHelp: "Ouvrez le lien de reservation dans l e-mail de confirmation pour gerer cette reservation.",
    backToAvailability: "Retour a la disponibilite",
    reservationCancelled: "Cette reservation a ete annulee.",
    thankYouDining: "Merci de votre visite !",
    cancelReservation: "Annuler la reservation",
    confirmCancelPrompt: "Etes-vous sur de vouloir annuler la reservation",
    keepReservation: "Conserver la reservation",
    cancelling: "Annulation...",
    confirmCancellation: "Confirmer l annulation",
    cancelledSuccessfully: "Reservation annulee avec succes.",
    unableToCancel: "Nous n'avons pas pu annuler cette reservation. Elle est toujours confirmee."
  },
  es: {
    loadingReservation: "Cargando reserva...",
    unableToLoadDetails: "No se pueden cargar los detalles de la reserva.",
    reservationNotFound: "Reserva no encontrada o ya no accesible.",
    invalidAccessToken: "El token de acceso de la reserva es invalido o ha expirado.",
    missingCancelToken: "Este enlace no incluye el token seguro de cancelacion.",
    missingCancelTokenHelp: "Abre el enlace de reserva desde tu correo de confirmacion para gestionar esta reserva.",
    backToAvailability: "Volver a disponibilidad",
    reservationCancelled: "Esta reserva ha sido cancelada.",
    thankYouDining: "Gracias por visitarnos!",
    cancelReservation: "Cancelar reserva",
    confirmCancelPrompt: "Seguro que quieres cancelar la reserva",
    keepReservation: "Mantener reserva",
    cancelling: "Cancelando...",
    confirmCancellation: "Confirmar cancelacion",
    cancelledSuccessfully: "Reserva cancelada correctamente.",
    unableToCancel: "No pudimos cancelar esta reserva. Sigue confirmada."
  }
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];
