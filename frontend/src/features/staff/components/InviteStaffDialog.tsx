import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AppError, UserRole } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { inviteStaff } from "@/features/staff/api";
import { showApiError, showSuccess } from "@/lib/toast";

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: UserRole | null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function InviteStaffDialog({ open, onOpenChange, currentRole }: InviteStaffDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<UserRole>("STAFF");
  const [error, setError] = useState<string | null>(null);

  const allowedRoles = useMemo<UserRole[]>(() => {
    if (currentRole === "OWNER") {
      return ["MANAGER", "STAFF"];
    }
    return ["STAFF"];
  }, [currentRole]);

  useEffect(() => {
    if (open) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole(allowedRoles[0] ?? "STAFF");
      setError(null);
    }
  }, [allowedRoles, open]);

  const inviteMutation = useMutation({
    mutationFn: () => inviteStaff(email.trim(), firstName.trim(), lastName.trim(), role),
    onSuccess: () => {
      showSuccess(`${copy.invitationSentTo} ${email.trim()}`);
      onOpenChange(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole(allowedRoles[0] ?? "STAFF");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["staff", selectedRestaurantId] });
    },
    onError: (mutationError) => {
      if (typeof mutationError === "object" && mutationError !== null && "message" in mutationError) {
        setError((mutationError as unknown as AppError).message);
      }
      showApiError(mutationError);
    }
  });

  const handleSubmit = () => {
    if (!email.trim()) {
      setError(copy.emailRequired);
      return;
    }
    if (!firstName.trim()) {
      setError(copy.firstNameRequired);
      return;
    }
    if (!lastName.trim()) {
      setError(copy.lastNameRequired);
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError(copy.enterValidEmail);
      return;
    }
    if (!allowedRoles.includes(role)) {
      setError(copy.notAllowedRole);
      return;
    }

    setError(null);
    inviteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.inviteStaff}</DialogTitle>
          <DialogDescription>{copy.sendInviteEmail}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="invite-first-name">{copy.firstName}</label>
              <Input
                id="invite-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jane"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "invite-staff-error" : undefined}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="invite-last-name">{copy.lastName}</label>
              <Input
                id="invite-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Doe"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "invite-staff-error" : undefined}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="invite-email">{copy.email}</label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "invite-staff-error" : undefined}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="invite-role-trigger">{copy.role}</label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="invite-role-trigger" aria-invalid={Boolean(error)} aria-describedby={error ? "invite-staff-error" : undefined}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((allowedRole) => (
                    <SelectItem key={allowedRole} value={allowedRole}>
                      {allowedRole}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? <p id="invite-staff-error" className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={inviteMutation.isPending}>
            {copy.sendInvitation}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const COPY = {
  en: {
    invitationSentTo: "Invitation sent to",
    firstNameRequired: "First name is required",
    lastNameRequired: "Last name is required",
    emailRequired: "Email is required",
    enterValidEmail: "Enter a valid email address",
    notAllowedRole: "You are not allowed to invite this role",
    inviteStaff: "Invite Staff",
    sendInviteEmail: "Send an invitation email to join your restaurant workspace.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    role: "Role",
    cancel: "Cancel",
    sendInvitation: "Send Invitation"
  },
  nl: {
    invitationSentTo: "Uitnodiging verstuurd naar",
    firstNameRequired: "Voornaam is verplicht",
    lastNameRequired: "Achternaam is verplicht",
    emailRequired: "E-mail is verplicht",
    enterValidEmail: "Voer een geldig e-mailadres in",
    notAllowedRole: "Je mag deze rol niet uitnodigen",
    inviteStaff: "Personeel uitnodigen",
    sendInviteEmail: "Stuur een uitnodiging om deel te nemen aan de restaurantwerkruimte.",
    firstName: "Voornaam",
    lastName: "Achternaam",
    email: "E-mail",
    role: "Rol",
    cancel: "Annuleren",
    sendInvitation: "Uitnodiging versturen"
  },
  fr: {
    invitationSentTo: "Invitation envoyee a",
    firstNameRequired: "Le prenom est requis",
    lastNameRequired: "Le nom est requis",
    emailRequired: "L'e-mail est requis",
    enterValidEmail: "Entrez une adresse e-mail valide",
    notAllowedRole: "Vous n'etes pas autorise a inviter ce role",
    inviteStaff: "Inviter le personnel",
    sendInviteEmail: "Envoyez un e-mail d'invitation pour rejoindre l'espace restaurant.",
    firstName: "Prenom",
    lastName: "Nom",
    email: "E-mail",
    role: "Role",
    cancel: "Annuler",
    sendInvitation: "Envoyer l'invitation"
  },
  es: {
    invitationSentTo: "Invitacion enviada a",
    firstNameRequired: "El nombre es obligatorio",
    lastNameRequired: "El apellido es obligatorio",
    emailRequired: "El correo es obligatorio",
    enterValidEmail: "Introduce un correo valido",
    notAllowedRole: "No tienes permiso para invitar este rol",
    inviteStaff: "Invitar personal",
    sendInviteEmail: "Envia una invitacion por correo para unirse al espacio del restaurante.",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo",
    role: "Rol",
    cancel: "Cancelar",
    sendInvitation: "Enviar invitacion"
  }
} as const;
