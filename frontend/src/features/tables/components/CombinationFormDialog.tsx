import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { DiningTable, TableCombination } from "@/api/types";
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
  createCombination,
  deleteCombination,
  updateCombination
} from "@/features/tables/api";
import { canCombineTables, displayTableArea } from "@/features/tables/tableArea";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { showApiError, showSuccess } from "@/lib/toast";

interface CombinationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: DiningTable[];
  combination?: TableCombination | null;
  startInDeleteConfirm?: boolean;
  onSaved?: () => void;
}

export function CombinationFormDialog({
  open,
  onOpenChange,
  tables,
  combination,
  startInDeleteConfirm = false,
  onSaved
}: CombinationFormDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const isEditMode = Boolean(combination);
  const [name, setName] = useState("");
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [minCapacity, setMinCapacity] = useState(2);
  const [maxCapacity, setMaxCapacity] = useState(2);
  const [minTouched, setMinTouched] = useState(false);
  const [maxTouched, setMaxTouched] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTables = useMemo(
    () => tables.filter((table) => selectedTableIds.includes(table.id)),
    [selectedTableIds, tables]
  );
  const totalSeats = useMemo(
    () => selectedTables.reduce((sum, table) => sum + table.seats, 0),
    [selectedTables]
  );
  const suggestedMin = Math.max(1, Math.floor(totalSeats * 0.7));
  const suggestedMax = Math.max(1, totalSeats);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(combination?.name ?? "");
    setSelectedTableIds(combination?.tables.map((table) => table.id) ?? []);
    setMinCapacity(combination?.minCapacity ?? 2);
    setMaxCapacity(combination?.maxCapacity ?? 2);
    setMinTouched(false);
    setMaxTouched(false);
    setShowDeleteConfirm(startInDeleteConfirm && Boolean(combination));
    setError(null);
  }, [combination, open, startInDeleteConfirm]);

  useEffect(() => {
    if (!open || totalSeats === 0) {
      return;
    }
    if (!minTouched) {
      setMinCapacity(suggestedMin);
    }
    if (!maxTouched) {
      setMaxCapacity(suggestedMax);
    }
  }, [maxTouched, minTouched, open, suggestedMax, suggestedMin, totalSeats]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        tableIds: selectedTableIds.map((id) => Number(id)),
        minCapacity,
        maxCapacity
      };
      if (combination) {
        return updateCombination(combination.id, payload);
      }
      return createCombination(payload);
    },
    onSuccess: () => {
      showSuccess(combination ? copy.combinationUpdated : copy.combinationCreated);
      onOpenChange(false);
      onSaved?.();
      void queryClient.invalidateQueries({ queryKey: ["table-combinations", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!combination) return;
      await deleteCombination(combination.id);
    },
    onSuccess: () => {
      showSuccess(copy.combinationDeleted);
      onOpenChange(false);
      onSaved?.();
      void queryClient.invalidateQueries({ queryKey: ["table-combinations", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const handleSave = () => {
    if (!name.trim()) {
      setError(copy.nameRequired);
      return;
    }
    if (selectedTableIds.length < 2) {
      setError(copy.atLeastTwoTables);
      return;
    }
    if (!canCombineTables(selectedTables)) {
      setError(copy.areaConflict);
      return;
    }
    if (minCapacity > maxCapacity) {
      setError(copy.minCannotExceedMax);
      return;
    }
    setError(null);
    saveMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? copy.editCombination : copy.addCombination}</DialogTitle>
            <DialogDescription>{copy.combineTablesDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{copy.areaRuleHint}</p>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="combination-name">{copy.name}</label>
              <Input
                id="combination-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={copy.largeParty}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "combination-form-error" : undefined}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">{copy.tables}</label>
              <div className="max-h-44 space-y-2 overflow-auto rounded-md border p-3">
                {tables.map((table) => {
                  const selected = selectedTableIds.includes(table.id);
                  return (
                    <label key={table.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                      <span className="text-sm">
                        {table.label} ({table.seats} {copy.seats})
                        <span className="ml-1 text-muted-foreground">· {displayTableArea(table.area)}</span>
                        {table.allowCrossAreaCombine ? (
                          <span className="ml-1 text-[11px] text-muted-foreground">({copy.crossArea})</span>
                        ) : null}
                      </span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedTableIds((current) => [...current, table.id]);
                          } else {
                            setSelectedTableIds((current) => current.filter((id) => id !== table.id));
                          }
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="combination-min-capacity">{copy.minCapacity}</label>
                <Input
                  id="combination-min-capacity"
                  type="number"
                  min={1}
                  value={minCapacity}
                  onChange={(event) => {
                    setMinTouched(true);
                    setMinCapacity(Math.max(1, Number(event.target.value) || 1));
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "combination-form-error" : undefined}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="combination-max-capacity">{copy.maxCapacity}</label>
                <Input
                  id="combination-max-capacity"
                  type="number"
                  min={1}
                  value={maxCapacity}
                  onChange={(event) => {
                    setMaxTouched(true);
                    setMaxCapacity(Math.max(1, Number(event.target.value) || 1));
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "combination-form-error" : undefined}
                />
              </div>
            </div>

            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-medium">{copy.preview}</p>
              <p className="text-sm text-muted-foreground">
                {copy.selected}: {selectedTables.length ? selectedTables.map((table) => table.label).join(", ") : "-"}
              </p>
              <p className="text-sm text-muted-foreground">{copy.totalSeats}: {totalSeats}</p>
              <p className="text-xs text-muted-foreground">
                {copy.suggestedRange}: {suggestedMin}-{suggestedMax}
              </p>
            </div>

            {error ? <p id="combination-form-error" className="text-sm text-red-600">{error}</p> : null}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div>
              {isEditMode ? (
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  {copy.delete}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {copy.cancel}
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {isEditMode ? copy.saveChanges : copy.createCombination}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.deleteCombinationQuestion}</DialogTitle>
            <DialogDescription>
              {copy.remove} {combination?.name}? {copy.mayImpactSeating}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {copy.keepCombination}
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
    </>
  );
}

const COPY = {
  en: {
    combinationUpdated: "Combination updated",
    combinationCreated: "Combination created",
    combinationDeleted: "Combination deleted",
    nameRequired: "Name is required",
    atLeastTwoTables: "At least 2 tables are required",
    areaConflict:
      "Selected tables span different areas. Enable “Allow combining with other areas” on at least one mismatched table.",
    minCannotExceedMax: "Min capacity cannot exceed max capacity",
    editCombination: "Edit Combination",
    addCombination: "Add Combination",
    combineTablesDescription: "Combine tables to support larger or flexible party seating.",
    areaRuleHint: "Tables must share an area, unless at least one allows cross-area combining.",
    crossArea: "cross-area",
    name: "Name",
    largeParty: "Large Party",
    tables: "Tables",
    seats: "seats",
    minCapacity: "Min Capacity",
    maxCapacity: "Max Capacity",
    preview: "Preview",
    selected: "Selected",
    totalSeats: "Total seats",
    suggestedRange: "Suggested range",
    delete: "Delete",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    createCombination: "Create Combination",
    deleteCombinationQuestion: "Delete Combination?",
    remove: "Remove",
    mayImpactSeating: "This may impact seating options for larger parties.",
    keepCombination: "Keep Combination",
    confirmDelete: "Confirm Delete"
  },
  nl: {
    combinationUpdated: "Combinatie bijgewerkt",
    combinationCreated: "Combinatie aangemaakt",
    combinationDeleted: "Combinatie verwijderd",
    nameRequired: "Naam is verplicht",
    atLeastTwoTables: "Minstens 2 tafels zijn vereist",
    areaConflict:
      "Geselecteerde tafels liggen in verschillende zones. Zet “Mag combineren met andere zones” aan op minstens één tafel.",
    minCannotExceedMax: "Min capaciteit mag max capaciteit niet overschrijden",
    editCombination: "Combinatie bewerken",
    addCombination: "Combinatie toevoegen",
    combineTablesDescription: "Combineer tafels voor grotere of flexibele groepsplaatsing.",
    areaRuleHint: "Tafels moeten dezelfde zone delen, tenzij minstens één cross-zone combineren toelaat.",
    crossArea: "cross-zone",
    name: "Naam",
    largeParty: "Grote groep",
    tables: "Tafels",
    seats: "stoelen",
    minCapacity: "Min capaciteit",
    maxCapacity: "Max capaciteit",
    preview: "Voorbeeld",
    selected: "Geselecteerd",
    totalSeats: "Totaal stoelen",
    suggestedRange: "Voorgesteld bereik",
    delete: "Verwijderen",
    cancel: "Annuleren",
    saveChanges: "Wijzigingen opslaan",
    createCombination: "Combinatie maken",
    deleteCombinationQuestion: "Combinatie verwijderen?",
    remove: "Verwijder",
    mayImpactSeating: "Dit kan zitopties voor grotere groepen beinvloeden.",
    keepCombination: "Combinatie behouden",
    confirmDelete: "Verwijderen bevestigen"
  },
  fr: {
    combinationUpdated: "Combinaison mise a jour",
    combinationCreated: "Combinaison creee",
    combinationDeleted: "Combinaison supprimee",
    nameRequired: "Le nom est requis",
    atLeastTwoTables: "Au moins 2 tables sont requises",
    areaConflict:
      "Les tables selectionnees sont dans des zones differentes. Activez la combinaison hors zone sur au moins une table.",
    minCannotExceedMax: "La capacite min ne peut pas depasser la capacite max",
    editCombination: "Modifier la combinaison",
    addCombination: "Ajouter une combinaison",
    combineTablesDescription: "Combinez les tables pour accueillir des groupes plus grands.",
    areaRuleHint: "Les tables doivent partager une zone, sauf si au moins une autorise le hors zone.",
    crossArea: "hors zone",
    name: "Nom",
    largeParty: "Grand groupe",
    tables: "Tables",
    seats: "places",
    minCapacity: "Capacite min",
    maxCapacity: "Capacite max",
    preview: "Apercu",
    selected: "Selectionne",
    totalSeats: "Places totales",
    suggestedRange: "Plage suggeree",
    delete: "Supprimer",
    cancel: "Annuler",
    saveChanges: "Enregistrer les modifications",
    createCombination: "Creer la combinaison",
    deleteCombinationQuestion: "Supprimer la combinaison ?",
    remove: "Supprimer",
    mayImpactSeating: "Cela peut impacter le placement des grands groupes.",
    keepCombination: "Conserver la combinaison",
    confirmDelete: "Confirmer la suppression"
  },
  es: {
    combinationUpdated: "Combinacion actualizada",
    combinationCreated: "Combinacion creada",
    combinationDeleted: "Combinacion eliminada",
    nameRequired: "El nombre es obligatorio",
    atLeastTwoTables: "Se requieren al menos 2 mesas",
    areaConflict:
      "Las mesas seleccionadas estan en zonas distintas. Activa “Permitir combinar con otras zonas” en al menos una mesa.",
    minCannotExceedMax: "La capacidad minima no puede superar la maxima",
    editCombination: "Editar combinacion",
    addCombination: "Agregar combinacion",
    combineTablesDescription: "Combina mesas para grupos grandes o asignacion flexible.",
    areaRuleHint: "Las mesas deben compartir zona, salvo que al menos una permita combinar fuera de zona.",
    crossArea: "fuera de zona",
    name: "Nombre",
    largeParty: "Grupo grande",
    tables: "Mesas",
    seats: "asientos",
    minCapacity: "Capacidad minima",
    maxCapacity: "Capacidad maxima",
    preview: "Vista previa",
    selected: "Seleccionado",
    totalSeats: "Asientos totales",
    suggestedRange: "Rango sugerido",
    delete: "Eliminar",
    cancel: "Cancelar",
    saveChanges: "Guardar cambios",
    createCombination: "Crear combinacion",
    deleteCombinationQuestion: "Eliminar combinacion?",
    remove: "Eliminar",
    mayImpactSeating: "Esto puede afectar opciones de asiento para grupos grandes.",
    keepCombination: "Mantener combinacion",
    confirmDelete: "Confirmar eliminacion"
  }
} as const;
