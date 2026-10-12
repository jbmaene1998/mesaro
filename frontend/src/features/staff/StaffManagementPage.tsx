import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { MoreHorizontal, UserPlus } from "lucide-react";

import type { UserRole } from "@/api/types";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { TableSkeleton } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-media-query";
import { useAuth, useSelectedRestaurantId, useUserRole } from "@/hooks/use-auth";
import {
  getStaff,
  removeStaff,
  resendInvite,
  updateStaffRole,
  type StaffItem
} from "@/features/staff/api";
import { InviteStaffDialog } from "@/features/staff/components/InviteStaffDialog";
import { RoleBadge } from "@/features/staff/components/RoleBadge";
import { useI18n } from "@/i18n";
import { showApiError, showSuccess } from "@/lib/toast";

export function StaffManagementPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentRole = useUserRole();
  const selectedRestaurantId = useSelectedRestaurantId();
  const [openInvite, setOpenInvite] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<StaffItem | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ member: StaffItem; nextRole: UserRole } | null>(null);
  const isMobile = useIsMobile();

  const staffQuery = useQuery({
    queryKey: ["staff", selectedRestaurantId],
    queryFn: getStaff,
    enabled: Boolean(selectedRestaurantId)
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeStaff(id),
    onSuccess: () => {
      showSuccess(copy.removed);
      setConfirmRemove(null);
      void queryClient.invalidateQueries({ queryKey: ["staff", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateStaffRole(id, role),
    onSuccess: () => {
      showSuccess(copy.roleUpdated);
      setConfirmRoleChange(null);
      void queryClient.invalidateQueries({ queryKey: ["staff", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const resendInviteMutation = useMutation({
    mutationFn: (id: string) => resendInvite(id),
    onSuccess: () => {
      showSuccess(copy.inviteResent);
      void queryClient.invalidateQueries({ queryKey: ["staff", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const staffItems = staffQuery.data ?? [];
  const members = useMemo(() => staffItems.filter((item) => item.status === "ACTIVE"), [staffItems]);
  const pendingInvites = useMemo(
    () => staffItems.filter((item) => item.status === "INVITED"),
    [staffItems]
  );

  const roleOptions = useMemo<UserRole[]>(() => {
    if (currentRole === "OWNER") {
      return ["OWNER", "MANAGER", "STAFF"];
    }
    if (currentRole === "MANAGER") {
      return ["STAFF"];
    }
    return [];
  }, [currentRole]);

  const canChangeRole = (target: StaffItem) => {
    if (!currentRole) return false;
    if (target.userId && target.userId === user?.id) return false;
    if (currentRole === "OWNER") return true;
    if (currentRole === "MANAGER") return target.role !== "OWNER";
    return false;
  };

  const canRemove = (target: StaffItem) => {
    if (!currentRole) return false;
    if (target.userId && target.userId === user?.id) return false;
    if (currentRole === "OWNER") return true;
    if (currentRole === "MANAGER") return target.role === "STAFF";
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Button className="gap-2" onClick={() => setOpenInvite(true)}>
          <UserPlus className="h-4 w-4" />
          {copy.invite}
        </Button>
      </div>

      <ErrorBoundary level="section">
      <Card>
        <CardHeader>
          <CardTitle>{copy.active}</CardTitle>
        </CardHeader>
        <CardContent>
          {staffQuery.isLoading ? <TableSkeleton /> : null}

          {staffQuery.isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{copy.loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void staffQuery.refetch()}>
                {copy.retry}
              </Button>
            </div>
          ) : null}

          {!staffQuery.isLoading && !staffQuery.isError && members.length === 0 ? (
            <EmptyState
              title={copy.noStaff}
              description={copy.noStaffDesc}
              actionLabel={copy.inviteTeam}
              onAction={() => setOpenInvite(true)}
            />
          ) : null}

          {!staffQuery.isLoading && !staffQuery.isError && members.length > 0 && isMobile ? (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{member.name || "-"}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-2">
                        <RoleBadge role={member.role} />
                        <span className="text-xs text-muted-foreground">
                          {copy.lastLogin} {member.lastLoginAt ? format(new Date(member.lastLoginAt), "yyyy-MM-dd HH:mm") : "-"}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${member.email}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{copy.actions}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canChangeRole(member)
                          ? roleOptions
                              .filter((role) => role !== member.role)
                              .map((role) => (
                                <DropdownMenuItem
                                  key={`${member.id}-${role}`}
                                  onClick={() => setConfirmRoleChange({ member, nextRole: role })}
                                >
                                  {copy.changeRoleTo} {role}
                                </DropdownMenuItem>
                              ))
                          : null}
                        {canRemove(member) ? (
                          <DropdownMenuItem onClick={() => setConfirmRemove(member)}>{copy.remove}</DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!staffQuery.isLoading && !staffQuery.isError && members.length > 0 && !isMobile ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.name}</TableHead>
                  <TableHead>{copy.email}</TableHead>
                  <TableHead>{copy.role}</TableHead>
                  <TableHead>{copy.lastLogin}</TableHead>
                  <TableHead className="text-right">{copy.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.name || "-"}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell>
                      {member.lastLoginAt ? format(new Date(member.lastLoginAt), "yyyy-MM-dd HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${member.email}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{copy.actions}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {canChangeRole(member)
                            ? roleOptions
                                .filter((role) => role !== member.role)
                                .map((role) => (
                                  <DropdownMenuItem
                                    key={`${member.id}-${role}`}
                                    onClick={() => setConfirmRoleChange({ member, nextRole: role })}
                                  >
                                    {copy.changeRoleTo} {role}
                                  </DropdownMenuItem>
                                ))
                            : null}
                          {canRemove(member) ? (
                            <DropdownMenuItem onClick={() => setConfirmRemove(member)}>{copy.remove}</DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
      </ErrorBoundary>

      <ErrorBoundary level="section">
      <Card>
        <CardHeader>
          <CardTitle>{copy.pending}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingInvites.length === 0 && !staffQuery.isError ? (
            <EmptyState title={copy.noPending} description={copy.noPendingDesc} />
          ) : null}

          {pendingInvites.map((invite) => (
            <div key={invite.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="font-medium">{invite.email}</p>
                <div className="flex items-center gap-2">
                  <RoleBadge role={invite.role} />
                  <span className="text-xs text-muted-foreground">
                    {copy.sent} {invite.invitedAt ? formatDistanceToNow(new Date(invite.invitedAt), { addSuffix: true }) : "-"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {copy.expires} {invite.expiresAt ? formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true }) : "-"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resendInviteMutation.mutate(invite.id)}
                  disabled={resendInviteMutation.isPending}
                >
                  {copy.resend}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmRemove(invite)}
                >
                  {copy.cancel}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </ErrorBoundary>

      <InviteStaffDialog open={openInvite} onOpenChange={setOpenInvite} currentRole={currentRole} />

      <Dialog open={confirmRemove !== null} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmRemove?.status === "INVITED" ? copy.cancelInvite : copy.removeStaff}</DialogTitle>
            <DialogDescription>
              {confirmRemove?.status === "INVITED"
                ? `Cancel invitation for ${confirmRemove?.email}?`
                : `Remove ${confirmRemove?.email} from staff?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              {copy.keep}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmRemove) {
                  removeMutation.mutate(confirmRemove.id);
                }
              }}
              disabled={removeMutation.isPending}
            >
              {copy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRoleChange !== null} onOpenChange={(open) => !open && setConfirmRoleChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.changeRole}</DialogTitle>
            <DialogDescription>
              Change role for {confirmRoleChange?.member.email} to {confirmRoleChange?.nextRole}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRoleChange(null)}>
              {copy.cancel}
            </Button>
            <Button
              onClick={() => {
                if (confirmRoleChange) {
                  updateRoleMutation.mutate({
                    id: confirmRoleChange.member.id,
                    role: confirmRoleChange.nextRole
                  });
                }
              }}
              disabled={updateRoleMutation.isPending}
            >
              {copy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const COPY = {
    en: {
      removed: "Staff member removed",
      roleUpdated: "Role updated",
      inviteResent: "Invitation resent",
      title: "Staff",
      subtitle: "Manage team members and invitation workflow.",
      invite: "Invite Staff",
      active: "Active Staff",
      loadError: "Unable to load staff.",
      retry: "Retry",
      noStaff: "No staff invited yet",
      noStaffDesc: "Invite team members to collaborate on reservations and operations.",
      inviteTeam: "Invite team members",
      lastLogin: "Last login",
      actions: "Actions",
      changeRoleTo: "Change role to",
      remove: "Remove",
      name: "Name",
      email: "Email",
      role: "Role",
      pending: "Pending Invites",
      noPending: "No pending invitations",
      noPendingDesc: "Invite new staff members to see them here.",
      sent: "Sent",
      expires: "Expires",
      resend: "Resend",
      cancel: "Cancel",
      keep: "Keep",
      confirm: "Confirm",
      cancelInvite: "Cancel Invitation",
      removeStaff: "Remove Staff Member",
      changeRole: "Change Role"
    },
    nl: {
      removed: "Personeelslid verwijderd",
      roleUpdated: "Rol bijgewerkt",
      inviteResent: "Uitnodiging opnieuw verstuurd",
      title: "Personeel",
      subtitle: "Beheer teamleden en uitnodigingen.",
      invite: "Personeel uitnodigen",
      active: "Actief personeel",
      loadError: "Kan personeel niet laden.",
      retry: "Opnieuw",
      noStaff: "Nog geen personeel uitgenodigd",
      noStaffDesc: "Nodig teamleden uit voor samenwerking rond reserveringen.",
      inviteTeam: "Teamleden uitnodigen",
      lastLogin: "Laatste login",
      actions: "Acties",
      changeRoleTo: "Wijzig rol naar",
      remove: "Verwijderen",
      name: "Naam",
      email: "E-mail",
      role: "Rol",
      pending: "Openstaande uitnodigingen",
      noPending: "Geen openstaande uitnodigingen",
      noPendingDesc: "Nodig nieuw personeel uit om hier te tonen.",
      sent: "Verstuurd",
      expires: "Verloopt",
      resend: "Opnieuw versturen",
      cancel: "Annuleren",
      keep: "Behouden",
      confirm: "Bevestigen",
      cancelInvite: "Uitnodiging annuleren",
      removeStaff: "Personeelslid verwijderen",
      changeRole: "Rol wijzigen"
    },
    fr: {
      removed: "Membre du personnel supprime",
      roleUpdated: "Role mis a jour",
      inviteResent: "Invitation renvoyee",
      title: "Personnel",
      subtitle: "Gerez les membres et les invitations.",
      invite: "Inviter le personnel",
      active: "Personnel actif",
      loadError: "Impossible de charger le personnel.",
      retry: "Reessayer",
      noStaff: "Aucun membre invite",
      noStaffDesc: "Invitez des membres pour collaborer aux operations.",
      inviteTeam: "Inviter des membres",
      lastLogin: "Derniere connexion",
      actions: "Actions",
      changeRoleTo: "Changer le role en",
      remove: "Supprimer",
      name: "Nom",
      email: "E-mail",
      role: "Role",
      pending: "Invitations en attente",
      noPending: "Aucune invitation en attente",
      noPendingDesc: "Invitez du personnel pour les voir ici.",
      sent: "Envoyee",
      expires: "Expire",
      resend: "Renvoyer",
      cancel: "Annuler",
      keep: "Conserver",
      confirm: "Confirmer",
      cancelInvite: "Annuler l'invitation",
      removeStaff: "Supprimer le membre",
      changeRole: "Changer le role"
    },
    es: {
      removed: "Miembro del personal eliminado",
      roleUpdated: "Rol actualizado",
      inviteResent: "Invitacion reenviada",
      title: "Personal",
      subtitle: "Gestiona el equipo y el flujo de invitaciones.",
      invite: "Invitar personal",
      active: "Personal activo",
      loadError: "No se puede cargar el personal.",
      retry: "Reintentar",
      noStaff: "Aun no hay personal invitado",
      noStaffDesc: "Invita al equipo para colaborar en reservas y operaciones.",
      inviteTeam: "Invitar equipo",
      lastLogin: "Ultimo acceso",
      actions: "Acciones",
      changeRoleTo: "Cambiar rol a",
      remove: "Eliminar",
      name: "Nombre",
      email: "Correo",
      role: "Rol",
      pending: "Invitaciones pendientes",
      noPending: "No hay invitaciones pendientes",
      noPendingDesc: "Invita nuevo personal para verlo aqui.",
      sent: "Enviada",
      expires: "Expira",
      resend: "Reenviar",
      cancel: "Cancelar",
      keep: "Mantener",
      confirm: "Confirmar",
      cancelInvite: "Cancelar invitacion",
      removeStaff: "Eliminar miembro",
      changeRole: "Cambiar rol"
    }
} as const;
