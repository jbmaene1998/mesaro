import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { Reservation } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FormSkeleton } from "@/components/ui/loading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useHasPermission, useSelectedRestaurantId, useUserRole } from "@/hooks/use-auth";
import { getReservation, updateReservation, updateStatus } from "@/features/reservations/api";
import { CancelDialog } from "@/features/reservations/components/CancelDialog";
import { SeatGuestDialog } from "@/features/reservations/components/SeatGuestDialog";
import { SwitchTableDialog } from "@/features/reservations/components/SwitchTableDialog";
import {
  canCancelReservation,
  canCompleteReservation,
  canMarkNoShow,
  canSeatReservation,
  canSwitchTables as canSwitchTablesLifecycle
} from "@/features/reservations/lifecycle";
import { useI18n } from "@/i18n";
import { showApiError, showSuccess } from "@/lib/toast";

function statusBadgeClasses(status: Reservation["status"]) {
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  if (status === "SEATED") return "bg-green-100 text-green-800 hover:bg-green-100";
  if (status === "COMPLETED") return "bg-zinc-200 text-zinc-800 hover:bg-zinc-200";
  if (status === "NO_SHOW") return "bg-orange-100 text-orange-800 hover:bg-orange-100";
  return "bg-red-100 text-red-800 hover:bg-red-100";
}

export function ReservationDetailPage() {
  const { locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useUserRole();
  const selectedRestaurantId = useSelectedRestaurantId();
  const canUpdateStatus = useHasPermission("updateStatus");
  const canCancel = useHasPermission("cancelReservation");
  const canSwitchTables = useHasPermission("switchTables");
  const canEdit = role === "MANAGER" || role === "OWNER";
  const copy = {
    en: {
      updated: "Reservation updated",
      markedCompleted: "completed",
      markedNoShow: "no-show",
      guest: "Guest",
      loadError: "Unable to load reservation details.",
      retry: "Retry",
      noReservations: "No reservations found",
      notFound: "Reservation not found.",
      back: "Back to Reservations",
      status: "Status",
      seat: "Seat",
      noShow: "No-show",
      complete: "Complete",
      cancel: "Cancel",
      guestInfo: "Guest Information",
      guestName: "Guest name",
      guestEmail: "Guest email",
      guestPhone: "Guest phone",
      save: "Save",
      name: "Name",
      email: "Email",
      phone: "Phone",
      editGuest: "Edit Guest Info",
      details: "Reservation Details",
      dateTime: "Date & Time",
      partySize: "Party Size",
      assignedTables: "Assigned Table(s)",
      shift: "Shift",
      notesPlaceholder: "Special requests / notes",
      saveNotes: "Save Notes",
      notes: "Notes",
      editNotes: "Edit Notes",
      seatGuest: "Seat Guest",
      markNoShow: "Mark No-show",
      markCompleted: "Mark Completed",
      metadata: "Booking Metadata",
      createdAt: "Created At",
      code: "Confirmation Code",
      reservationId: "Reservation ID",
      markCompletedTitle: "Mark Completed",
      markNoShowTitle: "Mark No-show",
      confirm: "Confirm",
      switchTable: "Switch Table"
    },
    nl: {
      updated: "Reservering bijgewerkt",
      markedCompleted: "afgerond",
      markedNoShow: "no-show",
      guest: "Gast",
      loadError: "Kan reserveringsdetails niet laden.",
      retry: "Opnieuw",
      noReservations: "Geen reserveringen gevonden",
      notFound: "Reservering niet gevonden.",
      back: "Terug naar reserveringen",
      status: "Status",
      seat: "Plaatsen",
      noShow: "No-show",
      complete: "Voltooien",
      cancel: "Annuleren",
      guestInfo: "Gastinformatie",
      guestName: "Naam gast",
      guestEmail: "E-mail gast",
      guestPhone: "Telefoon gast",
      save: "Opslaan",
      name: "Naam",
      email: "E-mail",
      phone: "Telefoon",
      editGuest: "Gastinfo bewerken",
      details: "Reserveringsdetails",
      dateTime: "Datum & tijd",
      partySize: "Groepsgrootte",
      assignedTables: "Toegewezen tafel(s)",
      shift: "Shift",
      notesPlaceholder: "Speciale verzoeken / notities",
      saveNotes: "Notities opslaan",
      notes: "Notities",
      editNotes: "Notities bewerken",
      seatGuest: "Gast plaatsen",
      markNoShow: "Markeer no-show",
      markCompleted: "Markeer afgerond",
      metadata: "Boekingsmetadata",
      createdAt: "Aangemaakt op",
      code: "Bevestigingscode",
      reservationId: "Reserverings-ID",
      markCompletedTitle: "Markeer afgerond",
      markNoShowTitle: "Markeer no-show",
      confirm: "Bevestigen",
      switchTable: "Tafel wisselen"
    },
    fr: {
      updated: "Reservation mise a jour",
      markedCompleted: "terminee",
      markedNoShow: "no-show",
      guest: "Client",
      loadError: "Impossible de charger les details de reservation.",
      retry: "Reessayer",
      noReservations: "Aucune reservation trouvee",
      notFound: "Reservation introuvable.",
      back: "Retour aux reservations",
      status: "Statut",
      seat: "Placer",
      noShow: "No-show",
      complete: "Terminer",
      cancel: "Annuler",
      guestInfo: "Informations client",
      guestName: "Nom du client",
      guestEmail: "E-mail du client",
      guestPhone: "Telephone du client",
      save: "Enregistrer",
      name: "Nom",
      email: "E-mail",
      phone: "Telephone",
      editGuest: "Modifier infos client",
      details: "Details de reservation",
      dateTime: "Date & heure",
      partySize: "Taille du groupe",
      assignedTables: "Table(s) assignee(s)",
      shift: "Service",
      notesPlaceholder: "Demandes speciales / notes",
      saveNotes: "Enregistrer les notes",
      notes: "Notes",
      editNotes: "Modifier les notes",
      seatGuest: "Placer le client",
      markNoShow: "Marquer no-show",
      markCompleted: "Marquer terminee",
      metadata: "Metadonnees de reservation",
      createdAt: "Cree le",
      code: "Code de confirmation",
      reservationId: "ID reservation",
      markCompletedTitle: "Marquer terminee",
      markNoShowTitle: "Marquer no-show",
      confirm: "Confirmer",
      switchTable: "Changer de table"
    },
    es: {
      updated: "Reserva actualizada",
      markedCompleted: "completada",
      markedNoShow: "no-show",
      guest: "Cliente",
      loadError: "No se pueden cargar los detalles de la reserva.",
      retry: "Reintentar",
      noReservations: "No se encontraron reservas",
      notFound: "Reserva no encontrada.",
      back: "Volver a reservas",
      status: "Estado",
      seat: "Sentar",
      noShow: "No-show",
      complete: "Completar",
      cancel: "Cancelar",
      guestInfo: "Informacion del cliente",
      guestName: "Nombre del cliente",
      guestEmail: "Correo del cliente",
      guestPhone: "Telefono del cliente",
      save: "Guardar",
      name: "Nombre",
      email: "Correo",
      phone: "Telefono",
      editGuest: "Editar datos del cliente",
      details: "Detalles de la reserva",
      dateTime: "Fecha y hora",
      partySize: "Tamano del grupo",
      assignedTables: "Mesa(s) asignada(s)",
      shift: "Turno",
      notesPlaceholder: "Solicitudes especiales / notas",
      saveNotes: "Guardar notas",
      notes: "Notas",
      editNotes: "Editar notas",
      seatGuest: "Sentar cliente",
      markNoShow: "Marcar no-show",
      markCompleted: "Marcar completada",
      metadata: "Metadatos de reserva",
      createdAt: "Creada el",
      code: "Codigo de confirmacion",
      reservationId: "ID de reserva",
      markCompletedTitle: "Marcar completada",
      markNoShowTitle: "Marcar no-show",
      confirm: "Confirmar",
      switchTable: "Cambiar mesa"
    }
  }[locale];

  const [isEditingGuest, setIsEditingGuest] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [openSeatDialog, setOpenSeatDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openSwitchDialog, setOpenSwitchDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"complete" | "noshow" | null>(null);
  const reservationId = id ?? "";

  useEffect(() => {
    if (!id) {
      navigate("/reservations", { replace: true });
    }
  }, [id, navigate]);

  const reservationQuery = useQuery({
    queryKey: ["admin-reservation", selectedRestaurantId, id],
    queryFn: () => getReservation(reservationId),
    enabled: Boolean(id && selectedRestaurantId)
  });

  const reservation = reservationQuery.data?.data;

  const [guestDraft, setGuestDraft] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: ""
  });
  const [notesDraft, setNotesDraft] = useState("");

  const reservationDateTime = useMemo(() => {
    if (!reservation) {
      return "-";
    }
    if (reservation.startAtUtc && reservation.timezone) {
      return formatInTimeZone(new Date(reservation.startAtUtc), reservation.timezone, "EEE, MMM d yyyy - HH:mm zzz");
    }
    return `${reservation.date} ${reservation.time}`;
  }, [reservation]);

  const updateReservationMutation = useMutation({
    mutationFn: async (payload: { guestName?: string; guestEmail?: string; guestPhone?: string; notes?: string }) => {
      const current = await getReservation(reservationId);
      return updateReservation(reservationId, payload, current.etag);
    },
    onSuccess: () => {
      showSuccess(copy.updated);
      setIsEditingGuest(false);
      setIsEditingNotes(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-reservation", selectedRestaurantId, id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const statusMutation = useMutation({
    mutationFn: async (action: "complete" | "noshow") => {
      const current = await getReservation(reservationId);
      return updateStatus(reservationId, action, current.etag);
    },
    onSuccess: (_, action) => {
      const label = action === "complete" ? copy.markedCompleted : copy.markedNoShow;
      showSuccess(`${reservation?.guestName ?? copy.guest} ${label}`);
      setConfirmAction(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-reservation", selectedRestaurantId, id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["timeline", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  if (reservationQuery.isLoading) {
    return <FormSkeleton fields={6} />;
  }

  if (!id) {
    return null;
  }

  if (reservationQuery.isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{copy.loadError}</p>
          <Button className="mt-3" variant="outline" size="sm" onClick={() => void reservationQuery.refetch()}>
            {copy.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!reservation) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState title={copy.noReservations} description={copy.notFound} />
        </CardContent>
      </Card>
    );
  }

  const createdAt = reservation.createdAt;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit gap-1"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/reservations");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{reservation.confirmationCode}</h1>
            <Badge className={statusBadgeClasses(reservation.status)}>
              <span className="sr-only">{copy.status}: </span>
              {reservation.status}
            </Badge>
          </div>
        </div>
      </div>

      <ErrorBoundary level="section">
      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{copy.guestInfo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditingGuest ? (
                <div className="space-y-2">
                  <Input
                    value={guestDraft.guestName}
                    onChange={(event) => setGuestDraft((current) => ({ ...current, guestName: event.target.value }))}
                    placeholder={copy.guestName}
                  />
                  <Input
                    value={guestDraft.guestEmail}
                    onChange={(event) => setGuestDraft((current) => ({ ...current, guestEmail: event.target.value }))}
                    placeholder={copy.guestEmail}
                  />
                  <Input
                    value={guestDraft.guestPhone}
                    onChange={(event) => setGuestDraft((current) => ({ ...current, guestPhone: event.target.value }))}
                    placeholder={copy.guestPhone}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        updateReservationMutation.mutate({
                          guestName: guestDraft.guestName,
                          guestEmail: guestDraft.guestEmail,
                          guestPhone: guestDraft.guestPhone
                        })
                      }
                      disabled={updateReservationMutation.isPending}
                    >
                      {copy.save}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingGuest(false);
                        setGuestDraft({
                          guestName: reservation.guestName ?? "",
                          guestEmail: reservation.guestEmail ?? "",
                          guestPhone: reservation.guestPhone ?? ""
                        });
                      }}
                    >
                      {copy.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm">
                    <span className="font-medium">{copy.name}:</span> {reservation.guestName}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{copy.email}:</span>{" "}
                    <a className="text-primary underline" href={`mailto:${reservation.guestEmail}`}>
                      {reservation.guestEmail}
                    </a>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{copy.phone}:</span>{" "}
                    {reservation.guestPhone ? (
                      <a className="text-primary underline" href={`tel:${reservation.guestPhone}`}>
                        {reservation.guestPhone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                  {canEdit ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGuestDraft({
                          guestName: reservation.guestName ?? "",
                          guestEmail: reservation.guestEmail ?? "",
                          guestPhone: reservation.guestPhone ?? ""
                        });
                        setIsEditingGuest(true);
                      }}
                    >
                      {copy.editGuest}
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy.details}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                <span className="font-medium">{copy.dateTime}:</span> {reservationDateTime}
              </p>
              <p className="text-sm">
                <span className="font-medium">{copy.partySize}:</span> {reservation.partySize}
              </p>
              <p className="text-sm">
                <span className="font-medium">{copy.assignedTables}:</span>{" "}
                {reservation.tableLabels?.length ? reservation.tableLabels.join(", ") : "-"}
              </p>
              <p className="text-sm">
                <span className="font-medium">{copy.shift}:</span> {reservation.shiftName || reservation.shift?.name || "-"}
              </p>

              {isEditingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder={copy.notesPlaceholder}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateReservationMutation.mutate({ notes: notesDraft })}
                      disabled={updateReservationMutation.isPending}
                    >
                      {copy.saveNotes}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNotesDraft(reservation.notes ?? "");
                      }}
                    >
                      {copy.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm">
                    <span className="font-medium">{copy.notes}:</span> {reservation.notes || "-"}
                  </p>
                  {canEdit ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNotesDraft(reservation.notes ?? "");
                        setIsEditingNotes(true);
                      }}
                    >
                      {copy.editNotes}
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{copy.status}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge className={`${statusBadgeClasses(reservation.status)} text-sm`}>
                <span className="sr-only">{copy.status}: </span>
                {reservation.status}
              </Badge>
              <div className="flex flex-col gap-2">
                {canUpdateStatus && canSeatReservation(reservation).allowed ? (
                  <Button onClick={() => setOpenSeatDialog(true)}>{copy.seatGuest}</Button>
                ) : null}
                {canUpdateStatus && canMarkNoShow(reservation).allowed ? (
                  <Button variant="outline" onClick={() => setConfirmAction("noshow")}>
                    {copy.markNoShow}
                  </Button>
                ) : null}
                {canCancel && canCancelReservation(reservation).allowed ? (
                  <Button variant="destructive" onClick={() => setOpenCancelDialog(true)}>
                    {copy.cancel}
                  </Button>
                ) : null}
                {canUpdateStatus && canCompleteReservation(reservation).allowed ? (
                  <Button variant="outline" onClick={() => setConfirmAction("complete")}>
                    {copy.markCompleted}
                  </Button>
                ) : null}
                {canSwitchTables && canSwitchTablesLifecycle(reservation).allowed ? (
                  <Button variant="outline" onClick={() => setOpenSwitchDialog(true)}>
                    {copy.switchTable}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy.metadata}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{copy.createdAt}:</span>{" "}
                {createdAt ? format(new Date(createdAt), "yyyy-MM-dd HH:mm") : "-"}
              </p>
              <p>
                <span className="font-medium">{copy.code}:</span> {reservation.confirmationCode}
              </p>
              <p>
                <span className="font-medium">{copy.reservationId}:</span> {reservation.id}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </ErrorBoundary>

      <SeatGuestDialog
        reservation={reservation}
        open={openSeatDialog}
        onOpenChange={setOpenSeatDialog}
        onUpdated={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin-reservation", selectedRestaurantId, id] });
        }}
      />

      <CancelDialog
        reservation={reservation}
        open={openCancelDialog}
        onOpenChange={setOpenCancelDialog}
        onUpdated={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin-reservation", selectedRestaurantId, id] });
        }}
      />

      <SwitchTableDialog
        reservation={reservation}
        open={openSwitchDialog}
        onOpenChange={setOpenSwitchDialog}
        onUpdated={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin-reservation", selectedRestaurantId, id] });
        }}
      />

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction === "complete" ? copy.markCompletedTitle : copy.markNoShowTitle}</DialogTitle>
            <DialogDescription>
              {confirmAction === "complete"
                ? `${copy.markCompletedTitle}: ${reservation.guestName}?`
                : `${copy.markNoShowTitle}: ${reservation.guestName}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              {copy.cancel}
            </Button>
            <Button
              onClick={() => {
                if (confirmAction) {
                  statusMutation.mutate(confirmAction);
                }
              }}
              disabled={statusMutation.isPending}
            >
              {copy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
