import { useMemo, useState } from "react";

import type { Shift } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createShiftsBulk } from "@/features/shifts/api";
import {
  createBlankShiftDraft,
  defaultShiftDrafts,
  draftsFromPack,
  expandDraftWindows,
  SHIFT_TEMPLATES,
  type ShiftDraftWindow
} from "@/features/onboarding/templates";
import { buildSampleSlotsFromShifts, tomorrowInTimezone } from "@/features/onboarding/sampleSlots";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { normalizeLocalTime } from "@/lib/date";
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

function updateDraft(
  drafts: ShiftDraftWindow[],
  index: number,
  patch: Partial<ShiftDraftWindow>
): ShiftDraftWindow[] {
  return drafts.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function toggleDay(daysOfWeek: number[], day: number): number[] {
  if (daysOfWeek.includes(day)) {
    return daysOfWeek.filter((value) => value !== day);
  }
  return [...daysOfWeek, day].sort((a, b) => a - b);
}

export function ShiftsStep({
  copy,
  existingShifts,
  restaurantTimezone = "UTC",
  onSaved,
  onContinue
}: ShiftsStepProps) {
  const [drafts, setDrafts] = useState<ShiftDraftWindow[]>(() => defaultShiftDrafts());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCount = existingShifts.filter((shift) => shift.status === "ACTIVE").length;
  const alreadySaved = activeCount >= 1;

  const previewPayload = useMemo(() => expandDraftWindows(drafts), [drafts]);

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

  const sampleSlots = useMemo(() => {
    const { dayOfWeek } = tomorrowInTimezone(restaurantTimezone);
    if (alreadySaved) {
      return buildSampleSlotsFromShifts(existingShifts, dayOfWeek);
    }
    return buildSampleSlotsFromShifts(previewPayload, dayOfWeek);
  }, [alreadySaved, existingShifts, previewPayload, restaurantTimezone]);

  const applyPack = (id: "weekday-lunch-dinner" | "weekend-dinner") => {
    const pack = SHIFT_TEMPLATES.find((template) => template.id === id);
    if (!pack) {
      return;
    }
    setDrafts(draftsFromPack(pack, `${id}-${Date.now()}`));
  };

  const handleSave = async () => {
    if (alreadySaved) {
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

      {alreadySaved ? (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          {interpolate(copy.shiftsAlreadyDone, { count: activeCount })}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">{copy.shiftsPickPacks}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyPack("weekday-lunch-dinner")}>
                {copy.applyWeekday}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPack("weekend-dinner")}>
                {copy.applyWeekend}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDrafts((current) => [...current, createBlankShiftDraft(`new-${Date.now()}`)])
                }
              >
                {copy.addService}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {drafts.map((draft, index) => (
              <div key={draft.key} className="space-y-3 rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-[140px] flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor={`shift-name-${draft.key}`}>
                      {copy.serviceName}
                    </label>
                    <Input
                      id={`shift-name-${draft.key}`}
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((current) => updateDraft(current, index, { name: event.target.value }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-5"
                    onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
                  >
                    {copy.remove}
                  </Button>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{copy.serviceDays}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEK_DAY_KEYS.map((dayKey, dayIndex) => {
                      const dayOfWeek = dayIndex + 1;
                      const selected = draft.daysOfWeek.includes(dayOfWeek);
                      return (
                        <button
                          key={dayKey}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setDrafts((current) =>
                              updateDraft(current, index, {
                                daysOfWeek: toggleDay(draft.daysOfWeek, dayOfWeek)
                              })
                            )
                          }
                          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 font-medium"
                              : "text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          {copy[dayKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor={`shift-start-${draft.key}`}>
                      {copy.serviceStart}
                    </label>
                    <Input
                      id={`shift-start-${draft.key}`}
                      type="time"
                      value={normalizeLocalTime(draft.startTime)}
                      onChange={(event) =>
                        setDrafts((current) =>
                          updateDraft(current, index, { startTime: event.target.value })
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor={`shift-end-${draft.key}`}>
                      {copy.serviceEnd}
                    </label>
                    <Input
                      id={`shift-end-${draft.key}`}
                      type="time"
                      value={normalizeLocalTime(draft.endTime)}
                      onChange={(event) =>
                        setDrafts((current) => updateDraft(current, index, { endTime: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor={`shift-last-${draft.key}`}
                    >
                      {copy.serviceLastBooking}
                    </label>
                    <Input
                      id={`shift-last-${draft.key}`}
                      type="time"
                      value={normalizeLocalTime(draft.lastReservationTime)}
                      onChange={(event) =>
                        setDrafts((current) =>
                          updateDraft(current, index, { lastReservationTime: event.target.value })
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor={`shift-covers-${draft.key}`}
                    >
                      {copy.serviceMaxCovers}
                    </label>
                    <Input
                      id={`shift-covers-${draft.key}`}
                      type="number"
                      min={1}
                      max={500}
                      value={draft.maxCovers}
                      onChange={(event) =>
                        setDrafts((current) =>
                          updateDraft(current, index, {
                            maxCovers: Number(event.target.value) || 1
                          })
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
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
      )}

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

      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSubmitting || (!alreadySaved && previewPayload.length === 0)}
      >
        {isSubmitting ? copy.saving : alreadySaved ? copy.continue : copy.saveShifts}
      </Button>
    </div>
  );
}
