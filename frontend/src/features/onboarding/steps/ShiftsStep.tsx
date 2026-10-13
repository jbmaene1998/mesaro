import { useMemo, useState } from "react";

import type { Shift } from "@/api/types";
import { Button } from "@/components/ui/button";
import { createShiftsBulk } from "@/features/shifts/api";
import { expandShiftTemplate, SHIFT_TEMPLATES } from "@/features/onboarding/templates";
import { buildSampleSlotsFromShifts, tomorrowInTimezone } from "@/features/onboarding/sampleSlots";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { showApiError, showSuccess } from "@/lib/toast";

interface ShiftsStepProps {
  copy: WizardCopy;
  existingShifts: Shift[];
  restaurantTimezone?: string;
  onSaved: () => Promise<void>;
  onContinue: () => void;
}

const WEEK_DAY_KEYS = [
  "shiftsDayMon",
  "shiftsDayTue",
  "shiftsDayWed",
  "shiftsDayThu",
  "shiftsDayFri",
  "shiftsDaySat",
  "shiftsDaySun"
] as const;

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function ShiftsStep({
  copy,
  existingShifts,
  restaurantTimezone = "UTC",
  onSaved,
  onContinue
}: ShiftsStepProps) {
  const [selectedPackIds, setSelectedPackIds] = useState<Array<"weekday-lunch-dinner" | "weekend-dinner">>([
    "weekday-lunch-dinner"
  ]);
  const [maxCovers, setMaxCovers] = useState(40);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCount = existingShifts.filter((shift) => shift.status === "ACTIVE").length;

  const sampleSlots = useMemo(() => {
    if (activeCount < 1) {
      return [];
    }
    const { dayOfWeek } = tomorrowInTimezone(restaurantTimezone);
    return buildSampleSlotsFromShifts(existingShifts, dayOfWeek);
  }, [activeCount, existingShifts, restaurantTimezone]);

  const previewPayload = useMemo(() => {
    const packs = SHIFT_TEMPLATES.filter((pack) => selectedPackIds.includes(pack.id));
    return packs.flatMap((pack) =>
      expandShiftTemplate(pack).map((shift) => ({
        ...shift,
        maxCovers
      }))
    );
  }, [maxCovers, selectedPackIds]);

  const shiftsByDay = useMemo(() => {
    const grouped = new Map<number, Array<{ name: string; startTime: string; endTime: string }>>();
    for (let day = 1; day <= 7; day += 1) {
      grouped.set(day, []);
    }
    previewPayload.forEach((shift) => {
      const list = grouped.get(shift.dayOfWeek) ?? [];
      list.push({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime });
      grouped.set(shift.dayOfWeek, list);
    });
    return grouped;
  }, [previewPayload]);

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

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>{copy.shiftsTip1}</li>
        <li>{copy.shiftsTip2}</li>
        <li>{copy.shiftsTip3}</li>
      </ul>

      {activeCount === 0 ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">{copy.shiftsPickPacks}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => togglePack("weekday-lunch-dinner")}
                className={`rounded-md border px-3 py-3 text-left transition-colors ${
                  selectedPackIds.includes("weekday-lunch-dinner")
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40"
                }`}
              >
                <p className="text-sm font-medium">{copy.applyWeekday}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.shiftsPackWeekdayDesc}</p>
              </button>
              <button
                type="button"
                onClick={() => togglePack("weekend-dinner")}
                className={`rounded-md border px-3 py-3 text-left transition-colors ${
                  selectedPackIds.includes("weekend-dinner")
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40"
                }`}
              >
                <p className="text-sm font-medium">{copy.applyWeekend}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.shiftsPackWeekendDesc}</p>
              </button>
            </div>
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
            <p className="text-xs text-muted-foreground">{copy.maxCoversWhy}</p>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{copy.shiftsPreviewTitle}</p>
              <p className="text-xs text-muted-foreground">
                {interpolate(copy.shiftsWillCreate, { count: previewPayload.length })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {WEEK_DAY_KEYS.map((dayKey, index) => {
                const dayOfWeek = index + 1;
                const dayShifts = shiftsByDay.get(dayOfWeek) ?? [];
                return (
                  <div key={dayKey} className="rounded-md border bg-muted/20 p-2">
                    <p className="mb-1 text-xs font-semibold">{copy[dayKey]}</p>
                    {dayShifts.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">{copy.shiftsEmptyDay}</p>
                    ) : (
                      <div className="space-y-1">
                        {dayShifts.map((shift) => (
                          <p key={`${shift.name}-${shift.startTime}`} className="text-[11px] leading-tight">
                            <span className="font-medium">{shift.name}</span>
                            <br />
                            {shift.startTime}–{shift.endTime}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          {interpolate(copy.shiftsAlreadyDone, { count: activeCount })}
        </p>
      )}

      {activeCount >= 1 ? (
        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">{copy.slotsPreview}</p>
          {sampleSlots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sampleSlots.map((time) => (
                <span key={time} className="rounded-md border px-2 py-1 text-xs">
                  {time}
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
