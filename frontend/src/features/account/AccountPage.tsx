import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { changePassword, deleteCurrentUser, getCurrentUser, updateCurrentUser } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSkeleton, InlineLoader } from "@/components/ui/loading";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { showApiError, showSuccess } from "@/lib/toast";

export function AccountPage() {
  const { locale } = useI18n();
  const auth = useAuth();
  const [emailDraft, setEmailDraft] = useState("");
  const [fullNameDraft, setFullNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["auth-current-user"],
    queryFn: getCurrentUser
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }
    setEmailDraft(profileQuery.data.email ?? "");
    setFullNameDraft(profileQuery.data.fullName ?? "");
    setPhoneDraft(profileQuery.data.phone ?? "");
  }, [profileQuery.data]);

  const copy = {
    en: {
      accountUpdated: "Account details updated",
      passwordChanged: "Password changed. Please log in again.",
      title: "My Account",
      subtitle: "Manage your profile and password.",
      profile: "Profile",
      profileDesc: "Update your personal contact details.",
      errorProfile: "Unable to load account profile.",
      retry: "Retry",
      email: "Email",
      fullName: "Full name",
      phone: "Phone",
      optional: "Optional",
      saveProfile: "Save profile",
      changePassword: "Change Password",
      changePasswordDesc: "After changing password, you will be logged out for security.",
      currentPassword: "Current password",
      newPassword: "New password",
      confirmPassword: "Confirm new password",
      passwordMismatch: "Passwords do not match.",
      submitPassword: "Change password",
      deleteAccount: "Delete account",
      deleteAccountDesc: "Delete your account permanently. This action cannot be undone.",
      deleteAccountWarning: "If you own a restaurant, it will be permanently deleted including staff access.",
      cancel: "Cancel",
      confirmDelete: "Delete permanently",
      deleteTitle: "Delete account?",
      deletePrompt: "This action cannot be undone."
    },
    nl: {
      accountUpdated: "Accountgegevens bijgewerkt",
      passwordChanged: "Wachtwoord gewijzigd. Log opnieuw in.",
      title: "Mijn account",
      subtitle: "Beheer je profiel en wachtwoord.",
      profile: "Profiel",
      profileDesc: "Werk je persoonlijke contactgegevens bij.",
      errorProfile: "Kan accountprofiel niet laden.",
      retry: "Opnieuw",
      email: "E-mail",
      fullName: "Volledige naam",
      phone: "Telefoon",
      optional: "Optioneel",
      saveProfile: "Profiel opslaan",
      changePassword: "Wachtwoord wijzigen",
      changePasswordDesc: "Na het wijzigen van je wachtwoord word je voor veiligheid uitgelogd.",
      currentPassword: "Huidig wachtwoord",
      newPassword: "Nieuw wachtwoord",
      confirmPassword: "Bevestig nieuw wachtwoord",
      passwordMismatch: "Wachtwoorden komen niet overeen.",
      submitPassword: "Wachtwoord wijzigen",
      deleteAccount: "Account verwijderen",
      deleteAccountDesc: "Verwijder je account permanent. Deze actie kan niet ongedaan worden gemaakt.",
      deleteAccountWarning: "Als je eigenaar bent van een restaurant, wordt het inclusief personeel permanent verwijderd.",
      cancel: "Annuleren",
      confirmDelete: "Permanent verwijderen",
      deleteTitle: "Account verwijderen?",
      deletePrompt: "Deze actie kan niet ongedaan worden gemaakt."
    },
    fr: {
      accountUpdated: "Details du compte mis a jour",
      passwordChanged: "Mot de passe modifie. Reconnectez-vous.",
      title: "Mon compte",
      subtitle: "Gerez votre profil et mot de passe.",
      profile: "Profil",
      profileDesc: "Mettez a jour vos coordonnees personnelles.",
      errorProfile: "Impossible de charger le profil.",
      retry: "Reessayer",
      email: "E-mail",
      fullName: "Nom complet",
      phone: "Telephone",
      optional: "Optionnel",
      saveProfile: "Enregistrer le profil",
      changePassword: "Changer le mot de passe",
      changePasswordDesc: "Apres modification, vous serez deconnecte pour securite.",
      currentPassword: "Mot de passe actuel",
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Confirmer le nouveau mot de passe",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      submitPassword: "Changer le mot de passe",
      deleteAccount: "Supprimer le compte",
      deleteAccountDesc: "Supprimez votre compte definitivement. Action irreversible.",
      deleteAccountWarning: "Si vous etes proprietaire d un restaurant, il sera supprime avec les acces equipe.",
      cancel: "Annuler",
      confirmDelete: "Supprimer definitivement",
      deleteTitle: "Supprimer le compte ?",
      deletePrompt: "Cette action est irreversible."
    },
    es: {
      accountUpdated: "Datos de la cuenta actualizados",
      passwordChanged: "Contrasena cambiada. Inicia sesion de nuevo.",
      title: "Mi cuenta",
      subtitle: "Administra tu perfil y contrasena.",
      profile: "Perfil",
      profileDesc: "Actualiza tus datos de contacto.",
      errorProfile: "No se puede cargar el perfil.",
      retry: "Reintentar",
      email: "Correo",
      fullName: "Nombre completo",
      phone: "Telefono",
      optional: "Opcional",
      saveProfile: "Guardar perfil",
      changePassword: "Cambiar contrasena",
      changePasswordDesc: "Despues de cambiarla, se cerrara sesion por seguridad.",
      currentPassword: "Contrasena actual",
      newPassword: "Nueva contrasena",
      confirmPassword: "Confirmar nueva contrasena",
      passwordMismatch: "Las contrasenas no coinciden.",
      submitPassword: "Cambiar contrasena",
      deleteAccount: "Eliminar cuenta",
      deleteAccountDesc: "Elimina tu cuenta permanentemente. Esta accion no se puede deshacer.",
      deleteAccountWarning: "Si eres propietario de un restaurante, se eliminara junto con el acceso del personal.",
      cancel: "Cancelar",
      confirmDelete: "Eliminar permanentemente",
      deleteTitle: "Eliminar cuenta?",
      deletePrompt: "Esta accion no se puede deshacer."
    }
  }[locale];

  const profileMutation = useMutation({
    mutationFn: () =>
      updateCurrentUser({
        email: emailDraft.trim(),
        fullName: fullNameDraft.trim(),
        phone: phoneDraft.trim()
      }),
    onSuccess: async () => {
      showSuccess(copy.accountUpdated);
      await profileQuery.refetch();
      await auth.silentRefresh();
    },
    onError: (error) => showApiError(error)
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: async () => {
      showSuccess(copy.passwordChanged);
      await auth.logout();
    },
    onError: (error) => showApiError(error)
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteCurrentUser(),
    onSuccess: async () => {
      await auth.logout();
    },
    onError: (error) => showApiError(error)
  });

  const passwordMismatch = newPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmitPassword = currentPassword.trim().length > 0 && newPassword.length >= 8 && !passwordMismatch;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{copy.profile}</CardTitle>
          <CardDescription>{copy.profileDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileQuery.isLoading ? <FormSkeleton fields={3} /> : null}
          {profileQuery.isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{copy.errorProfile}</p>
              <Button variant="outline" size="sm" onClick={() => void profileQuery.refetch()}>
                {copy.retry}
              </Button>
            </div>
          ) : null}

          {!profileQuery.isLoading && !profileQuery.isError ? (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">{copy.email}</label>
                <input
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  type="email"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{copy.fullName}</label>
                <input
                  value={fullNameDraft}
                  onChange={(event) => setFullNameDraft(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  placeholder={copy.optional}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{copy.phone}</label>
                <input
                  value={phoneDraft}
                  onChange={(event) => setPhoneDraft(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  placeholder={copy.optional}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending || !emailDraft.trim()}>
                  {profileMutation.isPending ? <InlineLoader /> : null}
                  {copy.saveProfile}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.changePassword}</CardTitle>
          <CardDescription>{copy.changePasswordDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{copy.currentPassword}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{copy.newPassword}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{copy.confirmPassword}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            {passwordMismatch ? <p className="text-xs text-destructive">{copy.passwordMismatch}</p> : null}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => passwordMutation.mutate()}
              disabled={!canSubmitPassword || passwordMutation.isPending}
            >
              {passwordMutation.isPending ? <InlineLoader /> : null}
              {copy.submitPassword}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.deleteAccount}</CardTitle>
          <CardDescription>{copy.deleteAccountDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive">{copy.deleteAccountWarning}</p>
          <div className="flex justify-end">
            <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
              {copy.deleteAccount}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.deleteTitle}</DialogTitle>
            <DialogDescription>{copy.deletePrompt}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              {copy.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? <InlineLoader /> : null}
              {copy.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
