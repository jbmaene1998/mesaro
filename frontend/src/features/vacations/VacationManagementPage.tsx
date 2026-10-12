import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, PlusCircle } from "lucide-react";

import type { Vacation } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CardSkeleton } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, useSelectedRestaurantId, useUserRole } from "@/hooks/use-auth";
import {
  approveVacation,
  deleteVacation,
  getVacations,
  rejectVacation
} from "@/features/vacations/api";
import { VacationFormDialog } from "@/features/vacations/components/VacationFormDialog";
import { VacationStatusBadge } from "@/features/vacations/components/VacationStatusBadge";
import { useI18n } from "@/i18n";
import { showApiError, showSuccess } from "@/lib/toast";

function closureBadgeClass(reason: Vacation["reason"]) {
  if (reason === "HOLIDAY") return "bg-red-100 text-red-800";
  if (reason === "MAINTENANCE") return "bg-yellow-100 text-yellow-800";
  if (reason === "PRIVATE") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

export function VacationManagementPage() {
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const role = useUserRole();
  const selectedRestaurantId = useSelectedRestaurantId();
  const canManageClosures = role === "OWNER" || role === "MANAGER";
  const canApprove = role === "OWNER" || role === "MANAGER";
  const copy = {
    en: {
      deleted: "Vacation deleted",
      approved: "vacation approved",
      rejected: "Vacation rejected",
      staff: "Staff",
      title: "Vacations & Closures",
      subtitle: "Manage restaurant closures and staff time off.",
      restaurantClosures: "Restaurant Closures",
      staffVacations: "Staff Vacations",
      closures: "Closures",
      addClosure: "Add Closure",
      loadError: "Unable to load vacations.",
      loadStaffError: "Unable to load staff vacations.",
      retry: "Retry",
      noClosures: "No closures configured",
      noClosuresDesc: "Add closure periods for holidays or maintenance.",
      noClosuresDescStaff: "No scheduled closures. Contact a manager if the restaurant will be closed.",
      requestVacation: "Request Vacation",
      pendingRequests: "Pending Requests",
      approve: "Approve",
      reject: "Reject",
      noRequests: "No vacation requests found",
      noRequestsDesc: "Create a vacation request to get started.",
      requestedBy: "Requested by",
      reason: "Reason",
      edit: "Edit",
      delete: "Delete",
      rejectTitle: "Reject Vacation",
      rejectDesc: "Reject this vacation request? Optionally provide a reason.",
      optionalRejectReason: "Optional rejection reason",
      cancel: "Cancel"
    },
    nl: {
      deleted: "Vakantie verwijderd",
      approved: "vakantie goedgekeurd",
      rejected: "Vakantie afgewezen",
      staff: "Personeel",
      title: "Vakanties & Sluitingen",
      subtitle: "Beheer restaurantsluitingen en personeelsverlof.",
      restaurantClosures: "Restaurantsluitingen",
      staffVacations: "Personeelsvakanties",
      closures: "Sluitingen",
      addClosure: "Sluiting toevoegen",
      loadError: "Kan vakanties niet laden.",
      loadStaffError: "Kan personeelsvakanties niet laden.",
      retry: "Opnieuw",
      noClosures: "Geen sluitingen ingesteld",
      noClosuresDesc: "Voeg sluitingsperiodes toe voor feestdagen of onderhoud.",
      noClosuresDescStaff: "Geen geplande sluitingen. Neem contact op met een manager bij sluiting.",
      requestVacation: "Vakantie aanvragen",
      pendingRequests: "Openstaande aanvragen",
      approve: "Goedkeuren",
      reject: "Afwijzen",
      noRequests: "Geen vakantieaanvragen gevonden",
      noRequestsDesc: "Maak een vakantieaanvraag om te beginnen.",
      requestedBy: "Aangevraagd door",
      reason: "Reden",
      edit: "Bewerken",
      delete: "Verwijderen",
      rejectTitle: "Vakantie afwijzen",
      rejectDesc: "Deze vakantieaanvraag afwijzen? Geef optioneel een reden op.",
      optionalRejectReason: "Optionele reden voor afwijzing",
      cancel: "Annuleren"
    },
    fr: {
      deleted: "Conge supprime",
      approved: "conge approuve",
      rejected: "Conge refuse",
      staff: "Personnel",
      title: "Conges et fermetures",
      subtitle: "Gerez les fermetures et conges du personnel.",
      restaurantClosures: "Fermetures du restaurant",
      staffVacations: "Conges du personnel",
      closures: "Fermetures",
      addClosure: "Ajouter une fermeture",
      loadError: "Impossible de charger les conges.",
      loadStaffError: "Impossible de charger les conges du personnel.",
      retry: "Reessayer",
      noClosures: "Aucune fermeture configuree",
      noClosuresDesc: "Ajoutez des fermetures pour jours feries ou maintenance.",
      noClosuresDescStaff: "Aucune fermeture planifiee. Contactez un manager en cas de fermeture.",
      requestVacation: "Demander un conge",
      pendingRequests: "Demandes en attente",
      approve: "Approuver",
      reject: "Refuser",
      noRequests: "Aucune demande de conge trouvee",
      noRequestsDesc: "Creez une demande de conge pour commencer.",
      requestedBy: "Demande par",
      reason: "Raison",
      edit: "Modifier",
      delete: "Supprimer",
      rejectTitle: "Refuser le conge",
      rejectDesc: "Refuser cette demande de conge ? Raison optionnelle.",
      optionalRejectReason: "Raison optionnelle du refus",
      cancel: "Annuler"
    },
    es: {
      deleted: "Vacaciones eliminadas",
      approved: "vacaciones aprobadas",
      rejected: "Vacaciones rechazadas",
      staff: "Personal",
      title: "Vacaciones y cierres",
      subtitle: "Administra cierres del restaurante y descansos del personal.",
      restaurantClosures: "Cierres del restaurante",
      staffVacations: "Vacaciones del personal",
      closures: "Cierres",
      addClosure: "Agregar cierre",
      loadError: "No se pueden cargar las vacaciones.",
      loadStaffError: "No se pueden cargar vacaciones del personal.",
      retry: "Reintentar",
      noClosures: "No hay cierres configurados",
      noClosuresDesc: "Agrega periodos de cierre por festivos o mantenimiento.",
      noClosuresDescStaff: "No hay cierres programados. Contacta a un manager si el local cerrara.",
      requestVacation: "Solicitar vacaciones",
      pendingRequests: "Solicitudes pendientes",
      approve: "Aprobar",
      reject: "Rechazar",
      noRequests: "No se encontraron solicitudes",
      noRequestsDesc: "Crea una solicitud de vacaciones para empezar.",
      requestedBy: "Solicitado por",
      reason: "Motivo",
      edit: "Editar",
      delete: "Eliminar",
      rejectTitle: "Rechazar vacaciones",
      rejectDesc: "Rechazar esta solicitud? Puedes indicar un motivo.",
      optionalRejectReason: "Motivo opcional de rechazo",
      cancel: "Cancelar"
    }
  }[locale];

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"closure" | "staff">("staff");
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Vacation | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);

  const vacationsQuery = useQuery({
    queryKey: ["vacations", selectedRestaurantId],
    queryFn: getVacations,
    enabled: Boolean(selectedRestaurantId)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVacation(id),
    onSuccess: () => {
      showSuccess(copy.deleted);
      void queryClient.invalidateQueries({ queryKey: ["vacations", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const approveMutation = useMutation({
    mutationFn: (vacation: Vacation) => approveVacation(vacation.id),
    onMutate: (vacation) => {
      setApproveTargetId(vacation.id);
    },
    onSuccess: (_, vacation) => {
      const requester = vacation.requesterName || vacation.requesterEmail || vacation.userId || copy.staff;
      showSuccess(`${requester} ${copy.approved}`);
      void queryClient.invalidateQueries({ queryKey: ["vacations", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error),
    onSettled: () => {
      setApproveTargetId(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectVacation(id, reason),
    onSuccess: () => {
      showSuccess(copy.rejected);
      setRejectTarget(null);
      setRejectReason("");
      void queryClient.invalidateQueries({ queryKey: ["vacations", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const allVacations = vacationsQuery.data ?? [];
  const closures = useMemo(
    () => allVacations.filter((item) => item.type === "RESTAURANT_CLOSURE"),
    [allVacations]
  );
  const staffVacationsRaw = useMemo(
    () => allVacations.filter((item) => item.type === "STAFF_VACATION"),
    [allVacations]
  );

  const staffVacations = useMemo(() => {
    if (role === "STAFF") {
      return staffVacationsRaw.filter((item) => item.userId === user?.id);
    }
    return staffVacationsRaw;
  }, [role, staffVacationsRaw, user?.id]);

  const pendingStaffVacations = staffVacations.filter((item) => item.status === "PENDING");
  const resolvedStaffVacations = staffVacations.filter((item) => item.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <Tabs defaultValue="closures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="closures">{copy.restaurantClosures}</TabsTrigger>
          <TabsTrigger value="staff">{copy.staffVacations}</TabsTrigger>
        </TabsList>

        <TabsContent value="closures" className="focus:ring-0 focus:outline-none">
          <ErrorBoundary level="section">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{copy.closures}</CardTitle>
              {canManageClosures ? (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setFormMode("closure");
                    setSelectedVacation(null);
                    setOpenForm(true);
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                  {copy.addClosure}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-2">
              {vacationsQuery.isLoading ? <CardSkeleton /> : null}
              {vacationsQuery.isError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{copy.loadError}</p>
                  <Button variant="outline" size="sm" onClick={() => void vacationsQuery.refetch()}>
                    {copy.retry}
                  </Button>
                </div>
              ) : null}

              {!vacationsQuery.isLoading && !vacationsQuery.isError && closures.length === 0 ? (
                <EmptyState
                  title={copy.noClosures}
                  description={canManageClosures ? copy.noClosuresDesc : copy.noClosuresDescStaff}
                  actionLabel={canManageClosures ? copy.addClosure : undefined}
                  onAction={
                    canManageClosures
                      ? () => {
                          setFormMode("closure");
                          setSelectedVacation(null);
                          setOpenForm(true);
                        }
                      : undefined
                  }
                />
              ) : null}

              {!vacationsQuery.isLoading && !vacationsQuery.isError && closures.map((closure) => (
                <div key={closure.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {closure.startDate} to {closure.endDate}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className={closureBadgeClass(closure.reason)}>{closure.reason}</Badge>
                      <span className="text-xs text-muted-foreground">{closure.notes || "-"}</span>
                    </div>
                  </div>
                  {canManageClosures ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for closure ${closure.startDate}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setFormMode("closure");
                            setSelectedVacation(closure);
                            setOpenForm(true);
                          }}
                        >
                          {copy.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(closure.id)}
                          disabled={deleteMutation.isPending || approveMutation.isPending || rejectMutation.isPending}
                        >
                          {copy.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="staff" className="focus:ring-0 focus:outline-none">
          <ErrorBoundary level="section">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{copy.staffVacations}</CardTitle>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setFormMode("staff");
                  setSelectedVacation(null);
                  setOpenForm(true);
                }}
              >
                <PlusCircle className="h-4 w-4" />
                {copy.requestVacation}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {vacationsQuery.isLoading ? <CardSkeleton /> : null}
              {vacationsQuery.isError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">{copy.loadStaffError}</p>
                  <Button variant="outline" size="sm" onClick={() => void vacationsQuery.refetch()}>
                    {copy.retry}
                  </Button>
                </div>
              ) : null}

              {canApprove && pendingStaffVacations.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{copy.pendingRequests}</p>
                  {pendingStaffVacations.map((vacation) => (
                    <div key={vacation.id} className="rounded-md border border-amber-200 bg-amber-50/40 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {vacation.startDate} to {vacation.endDate}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {copy.requestedBy}: {vacation.requesterName || vacation.requesterEmail || vacation.userId || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">{vacation.notes || "-"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <VacationStatusBadge status={vacation.status} />
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(vacation)}
                            disabled={approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending}
                          >
                            {copy.approve}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectTarget(vacation)}
                            disabled={
                              rejectMutation.isPending
                              || approveMutation.isPending
                              || deleteMutation.isPending
                              || approveTargetId === vacation.id
                            }
                          >
                            {copy.reject}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {!vacationsQuery.isLoading && !vacationsQuery.isError && staffVacations.length === 0 ? (
                <EmptyState title={copy.noRequests} description={copy.noRequestsDesc} />
              ) : null}

              {!vacationsQuery.isError && (canApprove ? resolvedStaffVacations : staffVacations).map((vacation) => (
                <div key={vacation.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {vacation.startDate} to {vacation.endDate}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {copy.requestedBy}: {vacation.requesterName || vacation.requesterEmail || vacation.userId || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">{vacation.notes || "-"}</p>
                    <p className="text-xs text-muted-foreground">{copy.reason}: {vacation.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <VacationStatusBadge status={vacation.status} />
                    {(role === "OWNER" || role === "MANAGER" || vacation.userId === user?.id) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for vacation ${vacation.startDate}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setFormMode("staff");
                              setSelectedVacation(vacation);
                              setOpenForm(true);
                            }}
                          >
                            {copy.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(vacation.id)}
                            disabled={deleteMutation.isPending || approveMutation.isPending || rejectMutation.isPending}
                          >
                            {copy.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      <VacationFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        mode={formMode}
        vacation={selectedVacation}
      />

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.rejectTitle}</DialogTitle>
            <DialogDescription>{copy.rejectDesc}</DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={copy.optionalRejectReason}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              {copy.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectTarget) {
                  rejectMutation.mutate({
                    id: rejectTarget.id,
                    reason: rejectReason.trim() || undefined
                  });
                }
              }}
              disabled={rejectMutation.isPending}
            >
              {copy.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
