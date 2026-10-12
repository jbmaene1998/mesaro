import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ClosureReason, Vacation, VacationReason } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { createVacation, updateVacation, type VacationFormPayload } from "@/features/vacations/api";
import { showApiError, showSuccess } from "@/lib/toast";

const CLOSURE_REASONS = ["HOLIDAY", "MAINTENANCE", "PRIVATE", "OTHER"] as const;
const STAFF_REASONS = ["VACATION", "SICK", "PERSONAL", "OTHER"] as const;

interface VacationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "closure" | "staff";
  vacation?: Vacation | null;
  onSaved?: () => void;
}

export function VacationFormDialog({
  open,
  onOpenChange,
  mode,
  vacation,
  onSaved
}: VacationFormDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const [reason, setReason] = useState<string>("OTHER");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason(vacation?.reason ?? (mode === "closure" ? "HOLIDAY" : "VACATION"));
    setStartDate(vacation?.startDate ?? "");
    setEndDate(vacation?.endDate ?? "");
    setNotes(vacation?.notes ?? "");
    setError(null);
  }, [mode, open, vacation]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: VacationFormPayload = mode === "closure"
        ? { type: "RESTAURANT_CLOSURE" as const, reason: reason as ClosureReason, startDate, endDate, notes }
        : { type: "STAFF_VACATION" as const, reason: reason as VacationReason, startDate, endDate, notes };
      if (vacation) {
        return updateVacation(vacation.id, payload);
      }
      return createVacation(payload);
    },
    onSuccess: () => {
      showSuccess(vacation ? copy.vacationUpdated : copy.vacationCreated);
      onOpenChange(false);
      onSaved?.();
      void queryClient.invalidateQueries({ queryKey: ["vacations", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const handleSave = () => {
    if (!startDate || !endDate) {
      setError(copy.startEndRequired);
      return;
    }
    if (endDate < startDate) {
      setError(copy.endAfterOrEqual);
      return;
    }
    if (!notes.trim()) {
      setError(copy.reasonRequired);
      return;
    }
    setError(null);
    saveMutation.mutate();
  };

  const reasonOptions = mode === "closure" ? CLOSURE_REASONS : STAFF_REASONS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {vacation ? copy.edit : copy.add} {mode === "closure" ? copy.closure : copy.vacationRequest}
          </DialogTitle>
          <DialogDescription>
            {mode === "closure" ? copy.configureClosurePeriod : copy.submitStaffVacation}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">{copy.typeReason}</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">{copy.startDate}</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{copy.endDate}</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              {copy.reasonDescription} <span className="text-destructive">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              required
              aria-required="true"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={copy.reasonRequiredHint}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const COPY = {
  en: {
    vacationUpdated: "Vacation updated",
    vacationCreated: "Vacation created",
    startEndRequired: "Start and end dates are required",
    endAfterOrEqual: "End date must be after or equal to start date",
    reasonRequired: "Reason/description is required",
    edit: "Edit",
    add: "Add",
    closure: "Closure",
    vacationRequest: "Vacation Request",
    configureClosurePeriod: "Configure a restaurant closure period.",
    submitStaffVacation: "Submit a staff vacation request.",
    typeReason: "Type / Reason",
    startDate: "Start date",
    endDate: "End date",
    reasonDescription: "Reason / Description",
    addDetails: "Add details",
    reasonRequiredHint: "Required: add details",
    cancel: "Cancel",
    save: "Save"
  },
  nl: {
    vacationUpdated: "Vakantie bijgewerkt",
    vacationCreated: "Vakantie aangemaakt",
    startEndRequired: "Start- en einddatum zijn verplicht",
    endAfterOrEqual: "Einddatum moet na of gelijk aan startdatum zijn",
    reasonRequired: "Reden/omschrijving is verplicht",
    edit: "Bewerken",
    add: "Toevoegen",
    closure: "Sluiting",
    vacationRequest: "Vakantieaanvraag",
    configureClosurePeriod: "Configureer een restaurantsluitingsperiode.",
    submitStaffVacation: "Dien een personeelsvakantieaanvraag in.",
    typeReason: "Type / Reden",
    startDate: "Startdatum",
    endDate: "Einddatum",
    reasonDescription: "Reden / Omschrijving",
    addDetails: "Voeg details toe",
    reasonRequiredHint: "Verplicht: voeg details toe",
    cancel: "Annuleren",
    save: "Opslaan"
  },
  fr: {
    vacationUpdated: "Conge mis a jour",
    vacationCreated: "Conge cree",
    startEndRequired: "Les dates de debut et fin sont requises",
    endAfterOrEqual: "La date de fin doit etre egale ou posterieure a la date de debut",
    reasonRequired: "La raison/description est requise",
    edit: "Modifier",
    add: "Ajouter",
    closure: "Fermeture",
    vacationRequest: "Demande de conge",
    configureClosurePeriod: "Configurer une periode de fermeture du restaurant.",
    submitStaffVacation: "Soumettre une demande de conge du personnel.",
    typeReason: "Type / Raison",
    startDate: "Date de debut",
    endDate: "Date de fin",
    reasonDescription: "Raison / Description",
    addDetails: "Ajouter des details",
    reasonRequiredHint: "Obligatoire : ajoutez des details",
    cancel: "Annuler",
    save: "Enregistrer"
  },
  es: {
    vacationUpdated: "Vacaciones actualizadas",
    vacationCreated: "Vacaciones creadas",
    startEndRequired: "Las fechas de inicio y fin son obligatorias",
    endAfterOrEqual: "La fecha de fin debe ser posterior o igual a la de inicio",
    reasonRequired: "Motivo/descripcion es obligatorio",
    edit: "Editar",
    add: "Agregar",
    closure: "Cierre",
    vacationRequest: "Solicitud de vacaciones",
    configureClosurePeriod: "Configura un periodo de cierre del restaurante.",
    submitStaffVacation: "Enviar una solicitud de vacaciones del personal.",
    typeReason: "Tipo / Motivo",
    startDate: "Fecha de inicio",
    endDate: "Fecha de fin",
    reasonDescription: "Motivo / Descripcion",
    addDetails: "Agregar detalles",
    reasonRequiredHint: "Obligatorio: agrega detalles",
    cancel: "Cancelar",
    save: "Guardar"
  }
} as const;
