import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { ReservationStatus } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/loading";
import { useHasPermission, useSelectedRestaurantId } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  defaultReservationDate,
  getReservations,
  type ReservationFilters
} from "@/features/reservations/api";
import { ManualReservationDialog } from "@/features/reservations/components/ManualReservationDialog";
import { WalkInDialog } from "@/features/reservations/components/WalkInDialog";
import { ReservationTable } from "@/features/reservations/components/ReservationTable";
import { useI18n } from "@/i18n";

const STATUS_OPTIONS: ReservationStatus[] = [
  "CONFIRMED",
  "SEATED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED"
];

function statusLabel(status: ReservationStatus) {
  if (status === "NO_SHOW") return "No-show";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function ReservationListPage() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canCreateWalkIn = useHasPermission("createWalkIn");
  const selectedRestaurantId = useSelectedRestaurantId();

  const copy = {
    en: {
      title: "Reservations",
      subtitle: "Monitor arrivals, seat guests, and resolve exceptions quickly.",
      allStatuses: "All statuses",
      selectedSuffix: "selected",
      newReservation: "New Reservation",
      newWalkIn: "New Walk-in",
      filters: "Filters",
      filtersDesc: "Choose a single date or a range to narrow reservation results.",
      date: "Date",
      dateRange: "Date range",
      startDate: "Start Date",
      endDate: "End Date",
      statuses: "Statuses",
      statusFilter: "Status Filter",
      reset: "Reset filters",
      invalidRange: "End date must be the same day or later than start date.",
      loading: "Loading reservations...",
      loadError: "Unable to load reservations.",
      retry: "Retry",
      noReservations: "No reservations found",
      noReservationsDesc: "Try widening the date window or resetting filters."
    },
    nl: {
      title: "Reserveringen",
      subtitle: "Volg aankomsten, plaats gasten en los uitzonderingen snel op.",
      allStatuses: "Alle statussen",
      selectedSuffix: "geselecteerd",
      newReservation: "Nieuwe reservering",
      newWalkIn: "Nieuwe walk-in",
      filters: "Filters",
      filtersDesc: "Kies een datum of bereik om resultaten te verfijnen.",
      date: "Datum",
      dateRange: "Datumbereik",
      startDate: "Startdatum",
      endDate: "Einddatum",
      statuses: "Statussen",
      statusFilter: "Statusfilter",
      reset: "Filters resetten",
      invalidRange: "Einddatum moet gelijk zijn aan of later dan startdatum.",
      loading: "Reserveringen laden...",
      loadError: "Kan reserveringen niet laden.",
      retry: "Opnieuw",
      noReservations: "Geen reserveringen gevonden",
      noReservationsDesc: "Probeer een groter datumbereik of reset filters."
    },
    fr: {
      title: "Reservations",
      subtitle: "Suivez les arrivees, placez les clients et gerez les exceptions.",
      allStatuses: "Tous les statuts",
      selectedSuffix: "selectionnes",
      newReservation: "Nouvelle reservation",
      newWalkIn: "Nouveau walk-in",
      filters: "Filtres",
      filtersDesc: "Choisissez une date ou une periode pour affiner les resultats.",
      date: "Date",
      dateRange: "Plage de dates",
      startDate: "Date de debut",
      endDate: "Date de fin",
      statuses: "Statuts",
      statusFilter: "Filtre de statut",
      reset: "Reinitialiser les filtres",
      invalidRange: "La date de fin doit etre egale ou posterieure a la date de debut.",
      loading: "Chargement des reservations...",
      loadError: "Impossible de charger les reservations.",
      retry: "Reessayer",
      noReservations: "Aucune reservation trouvee",
      noReservationsDesc: "Elargissez la periode ou reinitialisez les filtres."
    },
    es: {
      title: "Reservas",
      subtitle: "Monitorea llegadas, sienta clientes y resuelve excepciones rapido.",
      allStatuses: "Todos los estados",
      selectedSuffix: "seleccionados",
      newReservation: "Nueva reserva",
      newWalkIn: "Nuevo walk-in",
      filters: "Filtros",
      filtersDesc: "Elige una fecha o rango para acotar resultados.",
      date: "Fecha",
      dateRange: "Rango de fechas",
      startDate: "Fecha inicio",
      endDate: "Fecha fin",
      statuses: "Estados",
      statusFilter: "Filtro de estado",
      reset: "Restablecer filtros",
      invalidRange: "La fecha final debe ser igual o posterior a la inicial.",
      loading: "Cargando reservas...",
      loadError: "No se pueden cargar las reservas.",
      retry: "Reintentar",
      noReservations: "No se encontraron reservas",
      noReservationsDesc: "Amplia el rango de fechas o restablece filtros."
    }
  }[locale];

  const [date, setDate] = useState(defaultReservationDate());
  const [useRange, setUseRange] = useState(false);
  const [startDate, setStartDate] = useState(defaultReservationDate());
  const [endDate, setEndDate] = useState(defaultReservationDate());
  const [statuses, setStatuses] = useState<ReservationStatus[]>(STATUS_OPTIONS);
  const [openManualReservation, setOpenManualReservation] = useState(false);
  const [openWalkIn, setOpenWalkIn] = useState(false);
  const hasInvalidDateRange = useRange && startDate > endDate;
  const dateRangeErrorId = "reservations-date-range-error";
  const statusesText = statuses.length === STATUS_OPTIONS.length
    ? copy.allStatuses
    : `${statuses.length} ${copy.statuses.toLowerCase()} ${copy.selectedSuffix}`;

  const filters = useMemo<ReservationFilters>(
    () => ({
      date: useRange ? undefined : date,
      startDate: useRange ? startDate : undefined,
      endDate: useRange ? endDate : undefined,
      statuses
    }),
    [date, endDate, startDate, statuses, useRange]
  );

  const reservationsQuery = useQuery({
    queryKey: ["admin-reservations", selectedRestaurantId, filters.date, filters.startDate, filters.endDate, (filters.statuses ?? []).join(",")],
    queryFn: () => getReservations(filters),
    enabled: Boolean(selectedRestaurantId) && !hasInvalidDateRange
  });

  const reservations = reservationsQuery.data ?? [];

  const toggleStatus = (status: ReservationStatus) => {
    setStatuses((current) => {
      const next = current.includes(status)
        ? current.filter((value) => value !== status)
        : [...current, status];

      // Keep at least one status selected and avoid backend implicit defaults.
      return next.length === 0 ? STATUS_OPTIONS : next;
    });
  };

  const resetFilters = () => {
    const today = defaultReservationDate();
    setDate(today);
    setStartDate(today);
    setEndDate(today);
    setUseRange(false);
    setStatuses(STATUS_OPTIONS);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="gap-4 pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl tracking-tight">{copy.title}</CardTitle>
              <CardDescription>{copy.subtitle}</CardDescription>
              <p className="text-sm text-muted-foreground">
                {reservations.length} result{reservations.length === 1 ? "" : "s"} | {statusesText}
              </p>
            </div>
            {canCreateWalkIn ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row md:self-center">
                <Button
                  className="h-11 w-full gap-2 sm:w-auto"
                  onClick={() => setOpenManualReservation(true)}
                  disabled={!selectedRestaurantId}
                >
                  <CalendarPlus className="h-4 w-4" />
                  {copy.newReservation}
                </Button>
                <Button
                  className="h-11 w-full gap-2 sm:w-auto"
                  variant="outline"
                  onClick={() => setOpenWalkIn(true)}
                  disabled={!selectedRestaurantId}
                >
                  <PlusCircle className="h-4 w-4" />
                  {copy.newWalkIn}
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{copy.filters}</CardTitle>
          <CardDescription>{copy.filtersDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="grid gap-4">
            <legend className="sr-only">Reservation filters</legend>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={useRange ? "outline" : "secondary"}
                className="h-10"
                onClick={() => setUseRange(false)}
                aria-pressed={!useRange}
              >
                {copy.date}
              </Button>
              <Button
                type="button"
                variant={useRange ? "secondary" : "outline"}
                className="h-10"
                onClick={() => setUseRange(true)}
                aria-pressed={useRange}
              >
                {copy.dateRange}
              </Button>
            </div>

            <div
              className={cn(
                "grid gap-3",
                useRange ? "md:grid-cols-2" : "md:grid-cols-[minmax(220px,320px),auto]"
              )}
            >
              {!useRange ? (
                <div className="space-y-1">
                  <label htmlFor="reservations-date" className="text-sm font-medium">
                    {copy.date}
                  </label>
                  <Input
                    id="reservations-date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label htmlFor="reservations-start-date" className="text-sm font-medium">
                      {copy.startDate}
                    </label>
                    <Input
                      id="reservations-start-date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      aria-invalid={hasInvalidDateRange}
                      aria-describedby={hasInvalidDateRange ? dateRangeErrorId : undefined}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="reservations-end-date" className="text-sm font-medium">
                      {copy.endDate}
                    </label>
                    <Input
                      id="reservations-end-date"
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      aria-invalid={hasInvalidDateRange}
                      aria-describedby={hasInvalidDateRange ? dateRangeErrorId : undefined}
                    />
                  </div>
                </>
              )}

              <div className="md:self-end">
                <Button variant="ghost" className="h-10 w-full md:w-auto" onClick={resetFilters}>
                  {copy.reset}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{copy.statuses}</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => {
                  const selected = statuses.includes(status);
                  return (
                    <Button
                      key={status}
                      type="button"
                      variant={selected ? "secondary" : "outline"}
                      className="h-9"
                      onClick={() => toggleStatus(status)}
                      aria-pressed={selected}
                    >
                      {statusLabel(status)}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{statusesText}</p>
            </div>
          </fieldset>

          {hasInvalidDateRange ? (
            <p id={dateRangeErrorId} role="alert" className="text-sm font-medium text-destructive">
              {copy.invalidRange}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ErrorBoundary level="section">
        <h2 className="sr-only">Reservation results</h2>
        <Card>
          <CardContent className="pt-6">
            {reservationsQuery.isLoading ? <TableSkeleton rows={5} label={copy.loading} /> : null}

            {reservationsQuery.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{copy.loadError}</p>
                <Button variant="outline" size="sm" onClick={() => void reservationsQuery.refetch()}>
                  {copy.retry}
                </Button>
              </div>
            ) : null}

            {!reservationsQuery.isLoading && !reservationsQuery.isError && reservations.length === 0 ? (
              <EmptyState
                title={copy.noReservations}
                description={copy.noReservationsDesc}
                actionLabel={copy.reset}
                onAction={resetFilters}
              />
            ) : null}

            {!reservationsQuery.isLoading && !reservationsQuery.isError && reservations.length > 0 ? (
              <ReservationTable
                reservations={reservations}
                onRowClick={(id) => navigate(`/reservations/${id}`)}
                onUpdated={() => {
                  void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
                }}
              />
            ) : null}
          </CardContent>
        </Card>
      </ErrorBoundary>

      {canCreateWalkIn ? (
        <div className="sticky bottom-3 z-20 space-y-2 md:hidden">
          <Button
            className="h-12 w-full gap-2 shadow-lg"
            onClick={() => setOpenManualReservation(true)}
            disabled={!selectedRestaurantId}
          >
            <CalendarPlus className="h-4 w-4" />
            {copy.newReservation}
          </Button>
          <Button
            className="h-12 w-full gap-2 shadow-lg"
            variant="outline"
            onClick={() => setOpenWalkIn(true)}
            disabled={!selectedRestaurantId}
          >
            <PlusCircle className="h-4 w-4" />
            {copy.newWalkIn}
          </Button>
        </div>
      ) : null}

      <ManualReservationDialog
        open={openManualReservation}
        onOpenChange={setOpenManualReservation}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
        }}
      />

      <WalkInDialog
        open={openWalkIn}
        onOpenChange={setOpenWalkIn}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
        }}
      />
    </div>
  );
}
