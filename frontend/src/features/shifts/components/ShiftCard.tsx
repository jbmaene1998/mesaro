import { useState } from "react";
import { X } from "lucide-react";

import type { Shift } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";

interface ShiftCardProps {
  shift: Shift;
  colorClass: string;
  onEdit: (shift: Shift) => void;
  onDelete: (shift: Shift) => void;
  onPublish: (shift: Shift) => void;
  onDeactivate: (shift: Shift) => void;
  actionPending?: boolean;
}

export function ShiftCard({
  shift,
  colorClass,
  onEdit,
  onDelete,
  onPublish,
  onDeactivate,
  actionPending = false
}: ShiftCardProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isActive = shift.status === "ACTIVE";
  const isDraft = shift.status === "DRAFT";
  const isInactive = shift.status === "INACTIVE";

  return (
    <>
      <div
        className={`group relative w-full rounded-md border p-3 text-left ${colorClass}`}
      >
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={copy.deleteShift}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="pr-7">
          <p className="text-sm font-semibold">{shift.name}</p>
          <p className="text-xs text-muted-foreground">
            {shift.startTime} - {shift.endTime}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{copy.maxCovers} {shift.maxCovers}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-xs">
            <span className={`h-2 w-2 rounded-full ${isActive ? "bg-green-500" : isDraft ? "bg-amber-500" : "bg-slate-400"}`} />
            {isActive ? copy.active : isDraft ? copy.draft : copy.inactive}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(shift)}>
              {copy.edit}
            </Button>
            {isDraft || isInactive ? (
              <Button size="sm" onClick={() => onPublish(shift)} disabled={actionPending}>
                {copy.publish}
              </Button>
            ) : null}
            {isActive ? (
              <Button variant="outline" size="sm" onClick={() => onDeactivate(shift)} disabled={actionPending}>
                {copy.deactivate}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.deleteShiftQuestion}</DialogTitle>
            <DialogDescription>
              {copy.deleteShiftDescription} {shift.name} ({shift.startTime}-{shift.endTime})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {copy.keepShift}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(shift);
                setConfirmDelete(false);
              }}
            >
              {copy.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const COPY = {
  en: {
    deleteShift: "Delete shift",
    maxCovers: "Max covers:",
    active: "Active",
    draft: "Draft",
    inactive: "Inactive",
    edit: "Edit",
    publish: "Publish",
    deactivate: "Deactivate",
    deleteShiftQuestion: "Delete Shift?",
    deleteShiftDescription: "Delete",
    keepShift: "Keep Shift",
    delete: "Delete"
  },
  nl: {
    deleteShift: "Shift verwijderen",
    maxCovers: "Max covers:",
    active: "Actief",
    draft: "Concept",
    inactive: "Inactief",
    edit: "Bewerken",
    publish: "Publiceren",
    deactivate: "Deactiveren",
    deleteShiftQuestion: "Shift verwijderen?",
    deleteShiftDescription: "Verwijder",
    keepShift: "Shift behouden",
    delete: "Verwijderen"
  },
  fr: {
    deleteShift: "Supprimer le service",
    maxCovers: "Couverts max :",
    active: "Actif",
    draft: "Brouillon",
    inactive: "Inactif",
    edit: "Modifier",
    publish: "Publier",
    deactivate: "Desactiver",
    deleteShiftQuestion: "Supprimer le service ?",
    deleteShiftDescription: "Supprimer",
    keepShift: "Conserver le service",
    delete: "Supprimer"
  },
  es: {
    deleteShift: "Eliminar turno",
    maxCovers: "Maximo cubiertos:",
    active: "Activo",
    draft: "Borrador",
    inactive: "Inactivo",
    edit: "Editar",
    publish: "Publicar",
    deactivate: "Desactivar",
    deleteShiftQuestion: "Eliminar turno?",
    deleteShiftDescription: "Eliminar",
    keepShift: "Mantener turno",
    delete: "Eliminar"
  }
} as const;
