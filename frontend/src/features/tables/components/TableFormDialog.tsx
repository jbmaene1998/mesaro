import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { DiningTable } from "@/api/types";
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
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { createTable, deleteTable, updateTable, type UnresolvableReservation } from "@/features/tables/api";
import { showApiError, showSuccess } from "@/lib/toast";

interface TableFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTables: DiningTable[];
  table?: DiningTable | null;
  startInDeleteConfirm?: boolean;
  onSaved?: () => void;
}

function isTableAvailableStatus(status: DiningTable["status"]) {
  return status === "AVAILABLE";
}

export function TableFormDialog({
  open,
  onOpenChange,
  existingTables,
  table,
  startInDeleteConfirm = false,
  onSaved
}: TableFormDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const isEditMode = Boolean(table);
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState(2);
  const [isActive, setIsActive] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAttention, setNeedsAttention] = useState<UnresolvableReservation[]>([]);
  const [reassignedCount, setReassignedCount] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLabel(table?.label ?? "");
    setSeats(table?.seats ?? 2);
    setIsActive(table ? isTableAvailableStatus(table.status) : true);
    setError(null);
    setShowDeleteConfirm(startInDeleteConfirm && Boolean(table));
  }, [open, startInDeleteConfirm, table]);

  const isDuplicateLabel = useMemo(() => {
    const normalized = label.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return existingTables.some((item) => {
      if (table && item.id === table.id) {
        return false;
      }
      return item.label.trim().toLowerCase() === normalized;
    });
  }, [existingTables, label, table]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        label: label.trim(),
        seats,
        status: isActive ? ("AVAILABLE" as const) : ("UNAVAILABLE" as const)
      };
      if (table) {
        const result = await updateTable(table.id, payload);
        return { isUpdate: true as const, result };
      }
      const result = await createTable(payload);
      return { isUpdate: false as const, result };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["tables", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["table-status", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["tables-status", selectedRestaurantId] });

      if (data.isUpdate) {
        onOpenChange(false);
        onSaved?.();
        if (data.result.needsAttention.length > 0) {
          setReassignedCount(data.result.reassigned.length);
          setNeedsAttention(data.result.needsAttention);
        } else if (data.result.reassigned.length > 0) {
          showSuccess(`${copy.tableUpdated} — ${data.result.reassigned.length} ${copy.reservationsReassigned}`);
        } else {
          showSuccess(copy.tableUpdated);
        }
      } else {
        showSuccess(copy.tableCreated);
        onOpenChange(false);
        onSaved?.();
      }
    },
    onError: (error) => showApiError(error)
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!table) {
        return;
      }
      await deleteTable(table.id);
    },
    onSuccess: () => {
      showSuccess(copy.tableDeleted);
      onOpenChange(false);
      onSaved?.();
      void queryClient.invalidateQueries({ queryKey: ["tables", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["table-status", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["tables-status", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const handleSave = () => {
    if (!label.trim()) {
      setError(copy.labelRequired);
      return;
    }
    if (isDuplicateLabel) {
      setError(copy.labelUnique);
      return;
    }
    setError(null);
    saveMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? copy.editTable : copy.addTable}</DialogTitle>
            <DialogDescription>
              {isEditMode ? copy.updateDetails : copy.createNew}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="table-label">{copy.label}</label>
                <Input
                  id="table-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="T1"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "table-form-error" : undefined}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="table-seats">{copy.seats}</label>
                <Input
                  id="table-seats"
                  type="number"
                  min={1}
                  max={20}
                  value={seats}
                  onChange={(event) => setSeats(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "table-form-error" : undefined}
                />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm" htmlFor="table-active">
              <input id="table-active" type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              {copy.available}
            </label>
            {error ? <p id="table-form-error" className="text-sm text-red-600">{error}</p> : null}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div>
              {isEditMode ? (
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  {copy.deleteTable}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {copy.cancel}
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {isEditMode ? copy.saveChanges : copy.createTable}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.deleteTableQuestion}</DialogTitle>
            <DialogDescription>
              {copy.deletingMayImpact} {table?.label}. {copy.cannotUndo}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {copy.keepTable}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {copy.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={needsAttention.length > 0} onOpenChange={(open) => { if (!open) setNeedsAttention([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.needsAttentionTitle}</DialogTitle>
            <DialogDescription>
              {reassignedCount > 0
                ? `${reassignedCount} ${copy.reservationsReassigned}. `
                : ""}
              {copy.needsAttentionDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {needsAttention.map((r) => (
              <div key={r.confirmationCode} className="rounded border p-3 text-sm">
                <p className="font-medium">{r.guestName} ({r.confirmationCode})</p>
                <p className="text-muted-foreground">{copy.partyOf} {r.partySize} — {r.startAtUtc}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setNeedsAttention([])}>
              {copy.understood}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const COPY = {
  en: {
    tableUpdated: "Table updated",
    tableCreated: "Table created",
    tableDeleted: "Table deleted",
    labelRequired: "Label is required",
    labelUnique: "Label must be unique",
    editTable: "Edit Table",
    addTable: "Add Table",
    updateDetails: "Update table details and availability.",
    createNew: "Create a new dining table.",
    label: "Label",
    seats: "Seats",
    available: "Available",
    deleteTable: "Delete Table",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    createTable: "Create Table",
    deleteTableQuestion: "Delete Table?",
    deletingMayImpact: "Deleting may impact future reservations and table assignments for",
    cannotUndo: "This action cannot be undone.",
    keepTable: "Keep Table",
    confirmDelete: "Confirm Delete",
    reservationsReassigned: "reservation(s) were auto-reassigned",
    needsAttentionTitle: "Reservations Need Manual Attention",
    needsAttentionDesc: "The following future reservations could not be auto-reassigned because no suitable alternative table was available. Please manually reassign or contact the guests.",
    partyOf: "Party of",
    understood: "I understand"
  },
  nl: {
    tableUpdated: "Tafel bijgewerkt",
    tableCreated: "Tafel aangemaakt",
    tableDeleted: "Tafel verwijderd",
    labelRequired: "Label is verplicht",
    labelUnique: "Label moet uniek zijn",
    editTable: "Tafel bewerken",
    addTable: "Tafel toevoegen",
    updateDetails: "Werk tafeldetails en beschikbaarheid bij.",
    createNew: "Maak een nieuwe restauranttafel aan.",
    label: "Label",
    seats: "Stoelen",
    available: "Beschikbaar",
    deleteTable: "Tafel verwijderen",
    cancel: "Annuleren",
    saveChanges: "Wijzigingen opslaan",
    createTable: "Tafel aanmaken",
    deleteTableQuestion: "Tafel verwijderen?",
    deletingMayImpact: "Verwijderen kan toekomstige reserveringen en toewijzingen beinvloeden voor",
    cannotUndo: "Deze actie kan niet ongedaan worden gemaakt.",
    keepTable: "Tafel behouden",
    confirmDelete: "Verwijderen bevestigen",
    reservationsReassigned: "reservering(en) automatisch opnieuw toegewezen",
    needsAttentionTitle: "Reserveringen vereisen handmatige aandacht",
    needsAttentionDesc: "De volgende toekomstige reserveringen konden niet automatisch worden heringedeeld omdat er geen geschikte alternatieve tafel beschikbaar was. Wijs ze handmatig opnieuw toe of neem contact op met de gasten.",
    partyOf: "Gezelschap van",
    understood: "Begrepen"
  },
  fr: {
    tableUpdated: "Table mise a jour",
    tableCreated: "Table creee",
    tableDeleted: "Table supprimee",
    labelRequired: "Le libelle est requis",
    labelUnique: "Le libelle doit etre unique",
    editTable: "Modifier la table",
    addTable: "Ajouter une table",
    updateDetails: "Mettre a jour les details et disponibilite de la table.",
    createNew: "Creer une nouvelle table.",
    label: "Libelle",
    seats: "Places",
    available: "Disponible",
    deleteTable: "Supprimer la table",
    cancel: "Annuler",
    saveChanges: "Enregistrer les modifications",
    createTable: "Creer la table",
    deleteTableQuestion: "Supprimer la table ?",
    deletingMayImpact: "La suppression peut impacter les reservations futures pour",
    cannotUndo: "Cette action est irreversible.",
    keepTable: "Conserver la table",
    confirmDelete: "Confirmer la suppression",
    reservationsReassigned: "reservation(s) reassignee(s) automatiquement",
    needsAttentionTitle: "Reservations necessitant une attention manuelle",
    needsAttentionDesc: "Les reservations futures suivantes n'ont pas pu etre reassignees automatiquement. Veuillez les reassigner manuellement ou contacter les clients.",
    partyOf: "Groupe de",
    understood: "Compris"
  },
  es: {
    tableUpdated: "Mesa actualizada",
    tableCreated: "Mesa creada",
    tableDeleted: "Mesa eliminada",
    labelRequired: "La etiqueta es obligatoria",
    labelUnique: "La etiqueta debe ser unica",
    editTable: "Editar mesa",
    addTable: "Agregar mesa",
    updateDetails: "Actualiza detalles y disponibilidad de la mesa.",
    createNew: "Crear una nueva mesa.",
    label: "Etiqueta",
    seats: "Asientos",
    available: "Disponible",
    deleteTable: "Eliminar mesa",
    cancel: "Cancelar",
    saveChanges: "Guardar cambios",
    createTable: "Crear mesa",
    deleteTableQuestion: "Eliminar mesa?",
    deletingMayImpact: "Eliminar puede afectar futuras reservas para",
    cannotUndo: "Esta accion no se puede deshacer.",
    keepTable: "Mantener mesa",
    confirmDelete: "Confirmar eliminacion",
    reservationsReassigned: "reserva(s) reasignada(s) automaticamente",
    needsAttentionTitle: "Reservas que requieren atencion manual",
    needsAttentionDesc: "Las siguientes reservas futuras no pudieron reasignarse automaticamente. Por favor, reasignalas manualmente o contacta a los clientes.",
    partyOf: "Grupo de",
    understood: "Entendido"
  }
} as const;
