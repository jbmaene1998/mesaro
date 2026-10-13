import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";

import type { Shift } from "@/api/types";
import { getAvailability } from "@/features/booking/api";
import { Button } from "@/components/ui/button";
import { createShiftsBulk } from "@/features/shifts/api";
import { expandShiftTemplate, SHIFT_TEMPLATES } from "@/features/onboarding/templates";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { showApiError, showSuccess } from "@/lib/toast";

interface ShiftsStepProps {
  copy: WizardCopy;
  existingShifts: Shift[];
  restaurantSlug?: string;
  onSaved: () => Promise<void>;
  onContinue: () => void;
}

export function ShiftsStep({
  copy,
  existingShifts,
  restaurantSlug,
  onSaved,
  onContinue
}: ShiftsStepProps) {
  const [selectedPackIds, setSelectedPackIds] = useState<Array<"weekday-lunch-dinner" | "weekend-dinner">>([
    "weekday-lunch-dinner"
  ]);
  const [maxCovers, setMaxCovers] = useState(40);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCount = existingShifts.filter((shift) => shift.status === "ACTIVE").length;
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const previewQuery = useQuery({
    queryKey: ["onboarding-availability-preview", restaurantSlug, tomorrow],
    queryFn: () => getAvailability(restaurantSlug!, tomorrow, 2),
    enabled: Boolean(restaurantSlug) && activeCount >= 1,
    retry: false
  });

  const previewPayload = useMemo(() => {
    const packs = SHIFT_TEMPLATES.filter((pack) => selectedPackIds.includes(pack.id));
    return packs.flatMap((pack) =>
      expandShiftTemplate(pack).map((shift) => ({
        ...shift,
        maxCovers
      }))
    );
  }, [maxCovers, selectedPackIds]);

  const togglePack = (id: "weekday-lunch-dinner" | "weekend-dinner") => {
    setSelectedPackIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleSave = async () => {
    if (activeCount >= 1) {
      onContinue();
      return;
    }
    if (previewPayload.length === 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createShiftsBulk(previewPayload, true);
      showSuccess(copy.shiftsSaved);
      await onSaved();
      onContinue();
    } catch (error) {
      showApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{copy.shiftsWhy}</p>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{copy.shiftsExample}</p>
      {activeCount === 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={selectedPackIds.includes("weekday-lunch-dinner") ? "default" : "outline"}
              size="sm"
              onClick={() => togglePack("weekday-lunch-dinner")}
            >
              {copy.applyWeekday}
            </Button>
            <Button
              type="button"
              variant={selectedPackIds.includes("weekend-dinner") ? "default" : "outline"}
              size="sm"
              onClick={() => togglePack("weekend-dinner")}
            >
              {copy.applyWeekend}
            </Button>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="wiz-covers">
              {copy.maxCoversHint}
            </label>
            <input
              id="wiz-covers"
              type="number"
              min={1}
              max={500}
              className="flex h-10 w-full max-w-[160px] rounded-md border border-input bg-background px-3 text-sm"
              value={maxCovers}
              onChange={(event) => setMaxCovers(Number(event.target.value) || 1)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {previewPayload.length} shifts will be created and activated.
          </p>
        </>
      ) : (
        <p className="text-sm">
          {activeCount} active shift{activeCount === 1 ? "" : "s"} already configured.
        </p>
      )}

      {activeCount >= 1 ? (
        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">{copy.slotsPreview}</p>
          {previewQuery.isLoading ? <p className="text-xs text-muted-foreground">{copy.saving}</p> : null}
          {(previewQuery.data?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(previewQuery.data ?? []).slice(0, 8).map((slot) => (
                <span key={slot.time} className="rounded-md border px-2 py-1 text-xs">
                  {slot.displayTime || slot.time}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{copy.noSlotsYet}</p>
          )}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSubmitting || (activeCount === 0 && previewPayload.length === 0)}
      >
        {isSubmitting ? copy.saving : activeCount > 0 ? copy.continue : copy.saveShifts}
      </Button>
    </div>
  );
}
