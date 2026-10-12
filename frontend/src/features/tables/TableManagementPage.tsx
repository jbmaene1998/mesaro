import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LayoutGrid, List, PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";

import type { DiningTable } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton, TableSkeleton } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-media-query";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { getTableById, getTableStatus, getTables, type TableStatus } from "@/features/tables/api";
import { CombinationsSection } from "@/features/tables/CombinationsSection";
import { TableCard } from "@/features/tables/components/TableCard";
import { TableFormDialog } from "@/features/tables/components/TableFormDialog";
import { useI18n } from "@/i18n";
import { showApiError } from "@/lib/toast";

const VIEW_STORAGE_KEY = "mesaro.tables.view";
type TableView = "grid" | "list";
type TableMode = "configuration" | "live";

function getSavedView(): TableView {
  if (typeof window === "undefined") {
    return "grid";
  }
  const value = localStorage.getItem(VIEW_STORAGE_KEY);
  return value === "list" ? "list" : "grid";
}

function statusBadgeClass(status: string | undefined) {
  if (status === "AVAILABLE") return "font-medium text-emerald-700";
  if (status === "UNAVAILABLE") return "font-medium text-rose-700";
  return "text-amber-700";
}

function tableStatusLabel(status: string | undefined) {
  if (!status) return "UNKNOWN";
  if (status === "UNAVAILABLE") return "Unavailable";
  if (status === "AVAILABLE") return "Available";
  if (status === "OCCUPIED") return "Occupied";
  return status;
}

export function TableManagementPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const selectedRestaurantId = useSelectedRestaurantId();
  const [view, setView] = useState<TableView>(getSavedView);
  const [mode, setMode] = useState<TableMode>("configuration");
  const [openForm, setOpenForm] = useState(false);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [startDelete, setStartDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<"tables" | "combinations">("tables");

  const tablesQuery = useQuery({
    queryKey: ["tables", selectedRestaurantId],
    queryFn: getTables,
    enabled: Boolean(selectedRestaurantId)
  });

  const liveStatusQuery = useQuery({
    queryKey: ["table-status", selectedRestaurantId, format(new Date(), "yyyy-MM-dd")],
    queryFn: () => getTableStatus(),
    enabled: Boolean(selectedRestaurantId),
    refetchInterval: mode === "live" ? 30_000 : 60_000
  });

  const tables = tablesQuery.data ?? [];
  const liveStatusByTableId = useMemo(
    () => new Map((liveStatusQuery.data ?? []).map((status) => [status.tableId, status])),
    [liveStatusQuery.data]
  );

  const setAndPersistView = (nextView: TableView) => {
    setView(nextView);
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_STORAGE_KEY, nextView);
    }
  };

  const effectiveView: TableView = isMobile ? "grid" : view;

  const openCreate = () => {
    setSelectedTable(null);
    setStartDelete(false);
    setOpenForm(true);
  };

  const openEdit = async (table: DiningTable, deleteIntent = false) => {
    setSelectedTable(table);
    setStartDelete(deleteIntent);
    setOpenForm(true);

    try {
      const freshTable = await queryClient.fetchQuery({
        queryKey: ["table", selectedRestaurantId, table.id],
        queryFn: () => getTableById(table.id)
      });
      setSelectedTable(freshTable);
    } catch (error) {
      // Keep editing with currently listed data if detail hydration fails.
      showApiError(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <PlusCircle className="h-4 w-4" />
          {copy.add}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "tables" | "combinations")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tables">{copy.tables}</TabsTrigger>
          <TabsTrigger value="combinations">{copy.combinations}</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4 focus:ring-0 focus:outline-none">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={mode === "configuration" ? "default" : "outline"} size="sm" onClick={() => setMode("configuration")}>
              {copy.configuration}
            </Button>
            <Button variant={mode === "live" ? "default" : "outline"} size="sm" onClick={() => setMode("live")}>
              {copy.liveStatus}
            </Button>
            <div className="mx-1 h-6 w-px bg-border" />
            {!isMobile ? (
              <>
                <Button variant={view === "grid" ? "default" : "outline"} size="sm" onClick={() => setAndPersistView("grid")}>
                  <LayoutGrid className="mr-1 h-4 w-4" />
                  {copy.grid}
                </Button>
                <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setAndPersistView("list")}>
                  <List className="mr-1 h-4 w-4" />
                  {copy.list}
                </Button>
              </>
            ) : null}
          </div>

          <ErrorBoundary level="section">
            <Card>
              <CardHeader>
                <CardTitle>{mode === "live" ? copy.currentStatus : copy.tableConfig}</CardTitle>
              </CardHeader>
              <CardContent>
                {tablesQuery.isLoading ? (effectiveView === "grid" ? <CardSkeleton /> : <TableSkeleton />) : null}

                {tablesQuery.isError ? (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">{copy.loadError}</p>
                    <Button variant="outline" size="sm" onClick={() => void tablesQuery.refetch()}>
                      {copy.retry}
                    </Button>
                  </div>
                ) : null}

                {mode === "live" && liveStatusQuery.isError ? (
                  <div className="mb-3 space-y-2">
                    <p className="text-sm text-destructive">{copy.liveError}</p>
                    <Button variant="outline" size="sm" onClick={() => void liveStatusQuery.refetch()}>
                      {copy.retryLive}
                    </Button>
                  </div>
                ) : null}

                {!tablesQuery.isLoading && !tablesQuery.isError && tables.length === 0 ? (
                  <EmptyState
                    title={copy.emptyTitle}
                    description={copy.emptyDesc}
                    actionLabel={copy.emptyAction}
                    onAction={openCreate}
                  />
                ) : null}

                {!tablesQuery.isLoading && !tablesQuery.isError && tables.length > 0 && effectiveView === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      liveStatus={liveStatusByTableId.get(table.id)}
                      onEdit={mode === "configuration" ? (item) => void openEdit(item, false) : undefined}
                      onDelete={mode === "configuration" ? (item) => void openEdit(item, true) : undefined}
                      readOnly={mode === "live"}
                    />
                  ))}
                </div>
              ) : null}

                {!tablesQuery.isLoading && !tablesQuery.isError && tables.length > 0 && effectiveView === "list" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.label}</TableHead>
                      <TableHead className="text-right">{copy.seats}</TableHead>
                      <TableHead>{copy.status}</TableHead>
                      <TableHead>{mode === "live" ? copy.currentReservation : copy.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => {
                      const liveStatus = liveStatusByTableId.get(table.id);
                      const effectiveStatus = liveStatus?.status ?? table.status;
                      const isOccupied = effectiveStatus === "OCCUPIED";
                      return (
                        <TableRow key={table.id}>
                          <TableCell className="font-medium">{table.label}</TableCell>
                          <TableCell className="text-right">{table.seats}</TableCell>
                          <TableCell>
                            <span className={statusBadgeClass(effectiveStatus as Parameters<typeof statusBadgeClass>[0])}>
                              {tableStatusLabel(effectiveStatus as Parameters<typeof tableStatusLabel>[0])}
                            </span>
                          </TableCell>
                          <TableCell>
                            {mode === "live" ? (
                              liveStatus?.reservation
                                ? `${liveStatus.reservation.guestName} ${copy.until} ${liveStatus.reservation.endTime}`
                                : "-"
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void openEdit(table, false)}
                                  disabled={isOccupied}
                                  title={isOccupied ? copy.occupiedCannotEdit : undefined}
                                >
                                  {copy.edit}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => void openEdit(table, true)}
                                  disabled={isOccupied}
                                  title={isOccupied ? copy.occupiedCannotEdit : undefined}
                                >
                                  {copy.delete}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                ) : null}
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="combinations" className="focus:ring-0 focus:outline-none">
          <CombinationsSection tables={tables} />
        </TabsContent>
      </Tabs>

      <TableFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        table={selectedTable}
        existingTables={tables}
        startInDeleteConfirm={startDelete}
      />
    </div>
  );
}

const COPY = {
    en: {
      title: "Tables",
      subtitle: "Manage table configuration and monitor current table status.",
      add: "Add Table",
      tables: "Tables",
      combinations: "Combinations",
      configuration: "Configuration",
      liveStatus: "Live Status",
      grid: "Grid",
      list: "List",
      currentStatus: "Current Table Status",
      tableConfig: "Table Configuration",
      loadError: "Unable to load tables.",
      retry: "Retry",
      liveError: "Unable to load live table status.",
      retryLive: "Retry live status",
      emptyTitle: "No tables configured",
      emptyDesc: "Create your floor setup to start accepting bookings.",
      emptyAction: "Add your first table",
      label: "Label",
      seats: "Seats",
      status: "Status",
      currentReservation: "Current Reservation",
      actions: "Actions",
      until: "until",
      edit: "Edit",
      delete: "Delete",
      occupiedCannotEdit: "Table is currently occupied and cannot be edited"
    },
    nl: {
      title: "Tafels",
      subtitle: "Beheer tafelconfiguratie en volg huidige tafelstatus.",
      add: "Tafel toevoegen",
      tables: "Tafels",
      combinations: "Combinaties",
      configuration: "Configuratie",
      liveStatus: "Live status",
      grid: "Raster",
      list: "Lijst",
      currentStatus: "Huidige tafelstatus",
      tableConfig: "Tafelconfiguratie",
      loadError: "Kan tafels niet laden.",
      retry: "Opnieuw",
      liveError: "Kan live tafelstatus niet laden.",
      retryLive: "Live status opnieuw",
      emptyTitle: "Geen tafels geconfigureerd",
      emptyDesc: "Maak je vloerindeling om boekingen te starten.",
      emptyAction: "Voeg je eerste tafel toe",
      label: "Label",
      seats: "Stoelen",
      status: "Status",
      currentReservation: "Huidige reservering",
      actions: "Acties",
      until: "tot",
      edit: "Bewerken",
      delete: "Verwijderen",
      occupiedCannotEdit: "Tafel is momenteel bezet en kan niet worden bewerkt"
    },
    fr: {
      title: "Tables",
      subtitle: "Gerez la configuration des tables et le statut en cours.",
      add: "Ajouter une table",
      tables: "Tables",
      combinations: "Combinaisons",
      configuration: "Configuration",
      liveStatus: "Statut en direct",
      grid: "Grille",
      list: "Liste",
      currentStatus: "Statut actuel des tables",
      tableConfig: "Configuration des tables",
      loadError: "Impossible de charger les tables.",
      retry: "Reessayer",
      liveError: "Impossible de charger le statut en direct.",
      retryLive: "Reessayer le statut",
      emptyTitle: "Aucune table configuree",
      emptyDesc: "Creez votre plan de salle pour accepter des reservations.",
      emptyAction: "Ajouter votre premiere table",
      label: "Libelle",
      seats: "Places",
      status: "Statut",
      currentReservation: "Reservation en cours",
      actions: "Actions",
      until: "jusqu'a",
      edit: "Modifier",
      delete: "Supprimer",
      occupiedCannotEdit: "La table est actuellement occupee et ne peut pas etre modifiee"
    },
    es: {
      title: "Mesas",
      subtitle: "Administra la configuracion de mesas y el estado actual.",
      add: "Agregar mesa",
      tables: "Mesas",
      combinations: "Combinaciones",
      configuration: "Configuracion",
      liveStatus: "Estado en vivo",
      grid: "Cuadricula",
      list: "Lista",
      currentStatus: "Estado actual de mesas",
      tableConfig: "Configuracion de mesas",
      loadError: "No se pueden cargar las mesas.",
      retry: "Reintentar",
      liveError: "No se puede cargar el estado en vivo de mesas.",
      retryLive: "Reintentar estado en vivo",
      emptyTitle: "No hay mesas configuradas",
      emptyDesc: "Crea tu plano de sala para comenzar a aceptar reservas.",
      emptyAction: "Agregar tu primera mesa",
      label: "Etiqueta",
      seats: "Asientos",
      status: "Estado",
      currentReservation: "Reserva actual",
      actions: "Acciones",
      until: "hasta",
      edit: "Editar",
      delete: "Eliminar",
      occupiedCannotEdit: "La mesa esta actualmente ocupada y no se puede editar"
    }
} as const;
