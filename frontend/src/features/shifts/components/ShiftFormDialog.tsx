import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Shift, ShiftStatus } from "@/api/types";
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
import { createShift, type ShiftFormPayload, updateShift } from "@/features/shifts/api";
import { showApiError, showSuccess } from "@/lib/toast";

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" }
];

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingShifts: Shift[];
  shift?: Shift | null;
  onSaved?: () => void;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const a = toRange(aStart, aEnd);
  const b = toRange(bStart, bEnd);
  return (
    rangeOverlap(a.start, a.end, b.start, b.end) ||
    rangeOverlap(a.start, a.end, b.start + 24 * 60, b.end + 24 * 60) ||
    rangeOverlap(a.start + 24 * 60, a.end + 24 * 60, b.start, b.end)
  );
}

function toRange(start: string, end: string) {
  const startMinute = toMinute(start);
  let endMinute = toMinute(end);
  if (endMinute <= startMinute) {
    endMinute += 24 * 60;
  }
  return { start: startMinute, end: endMinute };
}

function rangeOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function toMinute(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isWithinShiftWindow(startTime: string, endTime: string, value: string) {
  const startMinute = toMinute(startTime);
  let endMinute = toMinute(endTime);
  let valueMinute = toMinute(value);

  if (endMinute <= startMinute) {
    endMinute += 24 * 60;
    if (valueMinute < startMinute) {
      valueMinute += 24 * 60;
    }
  }

  return valueMinute >= startMinute && valueMinute <= endMinute;
}

export function ShiftFormDialog({
  open,
  onOpenChange,
  existingShifts,
  shift,
  onSaved
}: ShiftFormDialogProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const isEditMode = Boolean(shift);
  const [name, setName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState("11:30");
  const [endTime, setEndTime] = useState("14:30");
  const [lastReservationTime, setLastReservationTime] = useState("14:30");
  const [maxCovers, setMaxCovers] = useState(50);
  const [slotDuration, setSlotDuration] = useState(30);
  const [status, setStatus] = useState<ShiftStatus>("ACTIVE");
  const [error, setError] = useState<string | null>(null);
  const [publishConfirmationOpen, setPublishConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(shift?.name ?? "");
    setSelectedDays([shift?.dayOfWeek ?? 1]);
    setStartTime(shift?.startTime ?? "11:30");
    setEndTime(shift?.endTime ?? "14:30");
    setLastReservationTime(shift?.lastReservationTime ?? shift?.endTime ?? "14:30");
    setMaxCovers(shift?.maxCovers ?? 50);
    setSlotDuration(shift?.slotDurationMinutes ?? 30);
    setStatus((shift?.status as ShiftStatus | undefined) ?? "ACTIVE");
    setError(null);
    setPublishConfirmationOpen(false);
  }, [open, shift]);

  const overlapWarning = useMemo(() => {
    if (!selectedDays.length || !startTime || !endTime || startTime === endTime) {
      return null;
    }
    const daySet = new Set(selectedDays);
    const conflict = existingShifts.find((item) => {
      if (shift && item.id === shift.id) {
        return false;
      }
      if (!daySet.has(item.dayOfWeek)) {
        return false;
      }
      return overlaps(startTime, endTime, item.startTime, item.endTime);
    });
    return conflict ? `Overlaps with ${conflict.name} (${conflict.startTime}-${conflict.endTime})` : null;
  }, [endTime, existingShifts, selectedDays, shift, startTime]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payloadBase = {
        name: name.trim(),
        startTime,
        endTime,
        lastReservationTime,
        maxCovers,
        slotDurationMinutes: slotDuration,
        status
      };

      if (shift) {
        const payload: ShiftFormPayload = {
          ...payloadBase,
          dayOfWeek: selectedDays[0]
        };
        return updateShift(shift.id, payload);
      }

      const createTargets = selectedDays.map((dayOfWeek) =>
        createShift({
          ...payloadBase,
          dayOfWeek
        })
      );
      await Promise.all(createTargets);
      return null;
    },
    onSuccess: () => {
      showSuccess(shift ? copy.shiftUpdated : copy.shiftCreated);
      onOpenChange(false);
      onSaved?.();
      void queryClient.invalidateQueries({ queryKey: ["shifts", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const submitSave = () => {
    setError(null);
    saveMutation.mutate();
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError(copy.nameRequired);
      return;
    }
    if (!selectedDays.length) {
      setError(copy.selectAtLeastOneDay);
      return;
    }
    if (startTime === endTime) {
      setError(copy.startEndDifferent);
      return;
    }
    if (!isWithinShiftWindow(startTime, endTime, lastReservationTime)) {
      setError(copy.lastReservationWithinShift);
      return;
    }
    if (maxCovers <= 0) {
      setError(copy.maxCoversPositive);
      return;
    }

    if (status === "ACTIVE" && shift?.status !== "ACTIVE") {
      setPublishConfirmationOpen(true);
      return;
    }

    submitSave();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? copy.editShift : copy.addShift}</DialogTitle>
          <DialogDescription>{copy.configureService}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="shift-name">{copy.name}</label>
            <Input
              id="shift-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
                placeholder={copy.lunch}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "shift-form-error" : undefined}
            />
          </div>

          {isEditMode ? (
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="shift-day">{copy.dayOfWeek}</label>
              <Select
                value={String(selectedDays[0] ?? 1)}
                onValueChange={(value) => setSelectedDays([Number(value)])}
              >
                <SelectTrigger id="shift-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium">{copy.days}</label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-3">
                {DAY_OPTIONS.map((day) => (
                  <label key={day.value} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day.value)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedDays((current) => [...current, day.value].sort((a, b) => a - b));
                        } else {
                          setSelectedDays((current) => current.filter((value) => value !== day.value));
                        }
                      }}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="shift-start-time">{copy.startTime}</label>
              <Input id="shift-start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="shift-end-time">{copy.endTime}</label>
              <Input id="shift-end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="shift-last-reservation-time">{copy.lastReservationTime}</label>
            <Input
              id="shift-last-reservation-time"
              type="time"
              value={lastReservationTime}
              onChange={(event) => setLastReservationTime(event.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="shift-max-covers">{copy.maxCovers}</label>
              <Input
                id="shift-max-covers"
                type="number"
                min={1}
                value={maxCovers}
                onChange={(event) => setMaxCovers(Math.max(1, Number(event.target.value) || 1))}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "shift-form-error" : undefined}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="shift-slot-duration">{copy.slotDuration}</label>
              <Select value={String(slotDuration)} onValueChange={(value) => setSlotDuration(Number(value))}>
                <SelectTrigger id="shift-slot-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="shift-status">{copy.status}</label>
            <Select value={status} onValueChange={(value) => setStatus(value as ShiftStatus)}>
              <SelectTrigger id="shift-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">{copy.draft}</SelectItem>
                <SelectItem value="ACTIVE">{copy.active}</SelectItem>
                <SelectItem value="INACTIVE">{copy.inactive}</SelectItem>
              </SelectContent>
            </Select>
            {status === "ACTIVE" ? (
              <p className="text-xs text-muted-foreground">{copy.activeImpactHint}</p>
            ) : null}
          </div>

          {overlapWarning ? <p className="text-sm text-amber-600">{copy.warning}: {overlapWarning}</p> : null}
          {error ? <p id="shift-form-error" className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {isEditMode ? copy.saveChanges : copy.createShift}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      <Dialog open={publishConfirmationOpen} onOpenChange={setPublishConfirmationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.publishTitle}</DialogTitle>
            <DialogDescription>{copy.publishDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishConfirmationOpen(false)}>
              {copy.cancel}
            </Button>
            <Button
              onClick={() => {
                setPublishConfirmationOpen(false);
                submitSave();
              }}
              disabled={saveMutation.isPending}
            >
              {copy.publishNow}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const COPY = {
  en: {
    shiftUpdated: "Shift updated",
    shiftCreated: "Shift created",
    nameRequired: "Name is required",
    selectAtLeastOneDay: "Select at least one day",
    startEndDifferent: "Start time and end time cannot be the same",
    lastReservationWithinShift: "Last reservation time must be within the shift window",
    maxCoversPositive: "Max covers must be positive",
    editShift: "Edit Shift",
    addShift: "Add Shift",
    configureService: "Configure service period, capacity, and slot timing.",
    name: "Name",
    lunch: "Lunch",
    dayOfWeek: "Day of week",
    days: "Day(s)",
    startTime: "Start time",
    endTime: "End time",
    lastReservationTime: "Last possible reservation time",
    maxCovers: "Max covers",
    slotDuration: "Slot duration",
    status: "Status",
    draft: "Draft",
    active: "Active",
    inactive: "Inactive",
    activeImpactHint: "Active shifts are immediately bookable in reservation flows.",
    publishTitle: "Publish Shift",
    publishDescription: "Publishing makes this shift live and available for new reservations.",
    publishNow: "Publish now",
    warning: "Warning",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    createShift: "Create Shift"
  },
  nl: {
    shiftUpdated: "Shift bijgewerkt",
    shiftCreated: "Shift aangemaakt",
    nameRequired: "Naam is verplicht",
    selectAtLeastOneDay: "Selecteer minstens een dag",
    startEndDifferent: "Starttijd en eindtijd mogen niet gelijk zijn",
    lastReservationWithinShift: "Laatste reservatietijd moet binnen de shift vallen",
    maxCoversPositive: "Max covers moet positief zijn",
    editShift: "Shift bewerken",
    addShift: "Shift toevoegen",
    configureService: "Configureer serviceperiode, capaciteit en slot-timing.",
    name: "Naam",
    lunch: "Lunch",
    dayOfWeek: "Dag van de week",
    days: "Dag(en)",
    startTime: "Starttijd",
    endTime: "Eindtijd",
    lastReservationTime: "Laatste reservatietijd",
    maxCovers: "Max covers",
    slotDuration: "Slotduur",
    status: "Status",
    draft: "Concept",
    active: "Actief",
    inactive: "Inactief",
    activeImpactHint: "Actieve shifts zijn direct boekbaar in reserveringsstromen.",
    publishTitle: "Shift publiceren",
    publishDescription: "Publiceren maakt deze shift direct beschikbaar voor nieuwe reserveringen.",
    publishNow: "Nu publiceren",
    warning: "Waarschuwing",
    cancel: "Annuleren",
    saveChanges: "Wijzigingen opslaan",
    createShift: "Shift aanmaken"
  },
  fr: {
    shiftUpdated: "Service mis a jour",
    shiftCreated: "Service cree",
    nameRequired: "Le nom est requis",
    selectAtLeastOneDay: "Selectionnez au moins un jour",
    startEndDifferent: "L'heure de debut et l'heure de fin ne peuvent pas etre identiques",
    lastReservationWithinShift: "La derniere heure de reservation doit etre dans le service",
    maxCoversPositive: "Le max couverts doit etre positif",
    editShift: "Modifier le service",
    addShift: "Ajouter un service",
    configureService: "Configurez la periode de service, la capacite et la duree des slots.",
    name: "Nom",
    lunch: "Dejeuner",
    dayOfWeek: "Jour de la semaine",
    days: "Jour(s)",
    startTime: "Heure de debut",
    endTime: "Heure de fin",
    lastReservationTime: "Derniere heure de reservation",
    maxCovers: "Max couverts",
    slotDuration: "Duree du slot",
    status: "Statut",
    draft: "Brouillon",
    active: "Actif",
    inactive: "Inactif",
    activeImpactHint: "Les services actifs sont immediatement reservables.",
    publishTitle: "Publier le service",
    publishDescription: "La publication rend ce service disponible pour de nouvelles reservations.",
    publishNow: "Publier maintenant",
    warning: "Attention",
    cancel: "Annuler",
    saveChanges: "Enregistrer les modifications",
    createShift: "Creer le service"
  },
  es: {
    shiftUpdated: "Turno actualizado",
    shiftCreated: "Turno creado",
    nameRequired: "El nombre es obligatorio",
    selectAtLeastOneDay: "Selecciona al menos un dia",
    startEndDifferent: "La hora de inicio y fin no pueden ser iguales",
    lastReservationWithinShift: "La ultima hora de reserva debe estar dentro del turno",
    maxCoversPositive: "Maximo de comensales debe ser positivo",
    editShift: "Editar turno",
    addShift: "Agregar turno",
    configureService: "Configura periodo de servicio, capacidad y duracion de slots.",
    name: "Nombre",
    lunch: "Almuerzo",
    dayOfWeek: "Dia de la semana",
    days: "Dia(s)",
    startTime: "Hora de inicio",
    endTime: "Hora de fin",
    lastReservationTime: "Ultima hora posible de reserva",
    maxCovers: "Maximo comensales",
    slotDuration: "Duracion del slot",
    status: "Estado",
    draft: "Borrador",
    active: "Activo",
    inactive: "Inactivo",
    activeImpactHint: "Los turnos activos quedan disponibles de inmediato para nuevas reservas.",
    publishTitle: "Publicar turno",
    publishDescription: "Publicar hace que este turno quede activo para nuevas reservas.",
    publishNow: "Publicar ahora",
    warning: "Advertencia",
    cancel: "Cancelar",
    saveChanges: "Guardar cambios",
    createShift: "Crear turno"
  }
} as const;
