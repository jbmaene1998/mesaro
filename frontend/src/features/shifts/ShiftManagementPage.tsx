import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";

import type { Shift } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/loading";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { deleteShift, getShifts } from "@/features/shifts/api";
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

  const shiftsQuery = useQuery({
    queryKey: ["shifts", selectedRestaurantId],
    queryFn: getShifts,
    enabled: Boolean(selectedRestaurantId)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShift(id),
    onSuccess: () => {
      showSuccess(copy.deleted);
      void queryClient.invalidateQueries({ queryKey: ["shifts", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const shifts = shiftsQuery.data ?? [];

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
                          onEdit={(item) => {
                            setSelectedShift(item);
                            setOpenDialog(true);
                          }}
                          onDelete={(item) => deleteMutation.mutate(item.id)}
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
    </div>
  );
}

const COPY = {
  en: {
    deleted: "Shift deleted",
    title: "Shifts",
    subtitle: "Weekly shift schedule and capacity configuration.",
    add: "Add Shift",
    weekView: "Week View",
    loadError: "Unable to load shifts.",
    retry: "Retry",
    emptyTitle: "No shifts set up",
    emptyDesc: "Create at least one active shift to accept reservations.",
    emptyAction: "Create a shift",
    noShifts: "No shifts"
  },
  nl: {
    deleted: "Shift verwijderd",
    title: "Shifts",
    subtitle: "Wekelijks shiftschema en capaciteitsinstellingen.",
    add: "Shift toevoegen",
    weekView: "Weekoverzicht",
    loadError: "Kan shifts niet laden.",
    retry: "Opnieuw",
    emptyTitle: "Nog geen shifts ingesteld",
    emptyDesc: "Maak minstens een actieve shift om reserveringen te accepteren.",
    emptyAction: "Shift maken",
    noShifts: "Geen shifts"
  },
  fr: {
    deleted: "Service supprime",
    title: "Services",
    subtitle: "Planning hebdomadaire des services et capacite.",
    add: "Ajouter un service",
    weekView: "Vue hebdomadaire",
    loadError: "Impossible de charger les services.",
    retry: "Reessayer",
    emptyTitle: "Aucun service configure",
    emptyDesc: "Creez au moins un service actif pour accepter des reservations.",
    emptyAction: "Creer un service",
    noShifts: "Aucun service"
  },
  es: {
    deleted: "Turno eliminado",
    title: "Turnos",
    subtitle: "Horario semanal de turnos y configuracion de capacidad.",
    add: "Agregar turno",
    weekView: "Vista semanal",
    loadError: "No se pueden cargar los turnos.",
    retry: "Reintentar",
    emptyTitle: "No hay turnos configurados",
    emptyDesc: "Crea al menos un turno activo para aceptar reservas.",
    emptyAction: "Crear turno",
    noShifts: "Sin turnos"
  }
} as const;
