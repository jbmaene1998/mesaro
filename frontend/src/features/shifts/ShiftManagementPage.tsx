import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";

import type { Shift } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/loading";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import {
  activateShift,
  deactivateShift,
  deleteShift,
  getShifts,
  publishDraftShifts
} from "@/features/shifts/api";
import { ShiftCard } from "@/features/shifts/components/ShiftCard";
import { ShiftFormDialog } from "@/features/shifts/components/ShiftFormDialog";
import { useI18n } from "@/i18n";
import { showApiError, showSuccess } from "@/lib/toast";

const WEEK_DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" }
];

function shiftColorClass(name: string) {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes("lunch")) return "border-amber-300 bg-amber-50";
  if (normalized.includes("dinner")) return "border-indigo-300 bg-indigo-50";
  if (normalized.includes("brunch")) return "border-orange-300 bg-orange-50";
  return "border-slate-300 bg-slate-50";
}

export function ShiftManagementPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  const shiftsQuery = useQuery({
    queryKey: ["shifts", selectedRestaurantId],
    queryFn: getShifts,
    enabled: Boolean(selectedRestaurantId)
  });

  const invalidateShifts = () => {
    void queryClient.invalidateQueries({ queryKey: ["shifts", selectedRestaurantId] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShift(id),
    onSuccess: () => {
      showSuccess(copy.deleted);
      invalidateShifts();
    },
    onError: (error) => showApiError(error)
  });

  const publishOneMutation = useMutation({
    mutationFn: (id: string) => activateShift(id),
    onSuccess: () => {
      showSuccess(copy.publishedOne);
      invalidateShifts();
    },
    onError: (error) => showApiError(error)
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateShift(id),
    onSuccess: () => {
      showSuccess(copy.deactivated);
      invalidateShifts();
    },
    onError: (error) => showApiError(error)
  });

  const publishDraftsMutation = useMutation({
    mutationFn: () => publishDraftShifts(),
    onSuccess: (published) => {
      showSuccess(
        published.length === 1
          ? copy.publishedOne
          : copy.publishedMany.replace("{count}", String(published.length))
      );
      setPublishConfirmOpen(false);
      invalidateShifts();
    },
    onError: (error) => showApiError(error)
  });

  const shifts = shiftsQuery.data ?? [];
  const draftCount = useMemo(
    () => shifts.filter((shift) => shift.status === "DRAFT").length,
    [shifts]
  );
  const actionPending =
    publishOneMutation.isPending ||
    deactivateMutation.isPending ||
    publishDraftsMutation.isPending;

  const shiftsByDay = useMemo(() => {
    const grouped = new Map<number, Shift[]>();
    WEEK_DAYS.forEach((day) => grouped.set(day.value, []));
    shifts.forEach((shift) => {
      const current = grouped.get(shift.dayOfWeek) ?? [];
      current.push(shift);
      grouped.set(shift.dayOfWeek, current);
    });
    grouped.forEach((dayShifts, day) => {
      dayShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
      grouped.set(day, dayShifts);
    });
    return grouped;
  }, [shifts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {draftCount > 0 ? (
            <Button variant="secondary" onClick={() => setPublishConfirmOpen(true)} disabled={actionPending}>
              {copy.publishShifts}
              {draftCount > 1 ? ` (${draftCount})` : ""}
            </Button>
          ) : null}
          <Button
            className="gap-2"
            onClick={() => {
              setSelectedShift(null);
              setOpenDialog(true);
            }}
          >
            <PlusCircle className="h-4 w-4" />
            {copy.add}
          </Button>
        </div>
      </div>

      <ErrorBoundary level="section">
        <Card>
          <CardHeader>
            <CardTitle>{copy.weekView}</CardTitle>
          </CardHeader>
          <CardContent>
            {shiftsQuery.isLoading ? <CardSkeleton /> : null}
            {shiftsQuery.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{copy.loadError}</p>
                <Button variant="outline" size="sm" onClick={() => void shiftsQuery.refetch()}>
                  {copy.retry}
                </Button>
              </div>
            ) : null}

            {!shiftsQuery.isLoading && !shiftsQuery.isError && shifts.length === 0 ? (
              <EmptyState
                title={copy.emptyTitle}
                description={copy.emptyDesc}
                actionLabel={copy.emptyAction}
                onAction={() => {
                  setSelectedShift(null);
                  setOpenDialog(true);
                }}
              />
            ) : null}

            {!shiftsQuery.isLoading && !shiftsQuery.isError && shifts.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-7">
                {WEEK_DAYS.map((day) => (
                  <div key={day.value} className="rounded-md border p-2">
                    <p className="mb-2 text-sm font-semibold">{day.label}</p>
                    <div className="space-y-2">
                      {(shiftsByDay.get(day.value) ?? []).map((shift) => (
                        <ShiftCard
                          key={shift.id}
                          shift={shift}
                          colorClass={shiftColorClass(shift.name)}
                          actionPending={actionPending}
                          onEdit={(item) => {
                            setSelectedShift(item);
                            setOpenDialog(true);
                          }}
                          onDelete={(item) => deleteMutation.mutate(item.id)}
                          onPublish={(item) => publishOneMutation.mutate(item.id)}
                          onDeactivate={(item) => deactivateMutation.mutate(item.id)}
                        />
                      ))}
                      {(shiftsByDay.get(day.value) ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">{copy.noShifts}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </ErrorBoundary>

      <ShiftFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        shift={selectedShift}
        existingShifts={shifts}
      />

      <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.publishTitle}</DialogTitle>
            <DialogDescription>
              {draftCount === 1
                ? copy.publishDescriptionOne
                : copy.publishDescriptionMany.replace("{count}", String(draftCount))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishConfirmOpen(false)}>
              {copy.cancel}
            </Button>
            <Button
              onClick={() => publishDraftsMutation.mutate()}
              disabled={publishDraftsMutation.isPending}
            >
              {copy.publishNow}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const COPY = {
  en: {
    deleted: "Shift deleted",
    publishedOne: "Shift published",
    publishedMany: "{count} shifts published",
    deactivated: "Shift deactivated",
    title: "Shifts",
    subtitle: "Save shifts as drafts, then publish when you are ready to accept bookings.",
    add: "Add Shift",
    publishShifts: "Publish shifts",
    publishTitle: "Publish shifts",
    publishDescriptionOne: "Publishing makes this draft shift live and available for reservations.",
    publishDescriptionMany: "Publishing makes all {count} draft shifts live and available for reservations.",
    publishNow: "Publish now",
    cancel: "Cancel",
    weekView: "Week View",
    loadError: "Unable to load shifts.",
    retry: "Retry",
    emptyTitle: "No shifts set up",
    emptyDesc: "Save your first shift as a draft, then publish it to accept reservations.",
    emptyAction: "Add a shift",
    noShifts: "No shifts"
  },
  nl: {
    deleted: "Shift verwijderd",
    publishedOne: "Shift gepubliceerd",
    publishedMany: "{count} shifts gepubliceerd",
    deactivated: "Shift gedeactiveerd",
    title: "Shifts",
    subtitle: "Sla shifts op als concept en publiceer ze wanneer je klaar bent voor boekingen.",
    add: "Shift toevoegen",
    publishShifts: "Shifts publiceren",
    publishTitle: "Shifts publiceren",
    publishDescriptionOne: "Publiceren maakt deze concept-shift live en beschikbaar voor reserveringen.",
    publishDescriptionMany: "Publiceren maakt alle {count} concept-shifts live en beschikbaar voor reserveringen.",
    publishNow: "Nu publiceren",
    cancel: "Annuleren",
    weekView: "Weekoverzicht",
    loadError: "Kan shifts niet laden.",
    retry: "Opnieuw",
    emptyTitle: "Nog geen shifts ingesteld",
    emptyDesc: "Sla je eerste shift op als concept en publiceer hem om reserveringen te accepteren.",
    emptyAction: "Shift toevoegen",
    noShifts: "Geen shifts"
  },
  fr: {
    deleted: "Service supprime",
    publishedOne: "Service publie",
    publishedMany: "{count} services publies",
    deactivated: "Service desactive",
    title: "Services",
    subtitle: "Enregistrez les services en brouillon, puis publiez-les quand vous etes pret.",
    add: "Ajouter un service",
    publishShifts: "Publier les services",
    publishTitle: "Publier les services",
    publishDescriptionOne: "La publication rend ce brouillon disponible pour les reservations.",
    publishDescriptionMany: "La publication rend les {count} brouillons disponibles pour les reservations.",
    publishNow: "Publier maintenant",
    cancel: "Annuler",
    weekView: "Vue hebdomadaire",
    loadError: "Impossible de charger les services.",
    retry: "Reessayer",
    emptyTitle: "Aucun service configure",
    emptyDesc: "Enregistrez un premier service en brouillon, puis publiez-le pour accepter des reservations.",
    emptyAction: "Ajouter un service",
    noShifts: "Aucun service"
  },
  es: {
    deleted: "Turno eliminado",
    publishedOne: "Turno publicado",
    publishedMany: "{count} turnos publicados",
    deactivated: "Turno desactivado",
    title: "Turnos",
    subtitle: "Guarda los turnos como borrador y publicalos cuando estes listo para recibir reservas.",
    add: "Agregar turno",
    publishShifts: "Publicar turnos",
    publishTitle: "Publicar turnos",
    publishDescriptionOne: "Publicar hace que este borrador quede activo para nuevas reservas.",
    publishDescriptionMany: "Publicar hace que los {count} borradores queden activos para nuevas reservas.",
    publishNow: "Publicar ahora",
    cancel: "Cancelar",
    weekView: "Vista semanal",
    loadError: "No se pueden cargar los turnos.",
    retry: "Reintentar",
    emptyTitle: "No hay turnos configurados",
    emptyDesc: "Guarda tu primer turno como borrador y publicalo para aceptar reservas.",
    emptyAction: "Agregar turno",
    noShifts: "Sin turnos"
  }
} as const;
