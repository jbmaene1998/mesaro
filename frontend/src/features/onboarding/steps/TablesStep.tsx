import { useMemo, useState } from "react";

import type { DiningTable } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTable } from "@/features/tables/api";
import { TABLE_TEMPLATES } from "@/features/onboarding/templates";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { showApiError, showSuccess } from "@/lib/toast";

interface DraftTable {
  key: string;
  label: string;
  seats: number;
}

interface TablesStepProps {
  copy: WizardCopy;
  existingTables: DiningTable[];
  onSaved: () => Promise<void>;
  onContinue: () => void;
}

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function seatMixLabel(drafts: DraftTable[]) {
  const counts = new Map<number, number>();
  drafts.forEach((draft) => {
    if (draft.seats < 1) {
      return;
    }
    counts.set(draft.seats, (counts.get(draft.seats) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([seats, count]) => `${count}×${seats}`)
    .join(" · ");
}

export function TablesStep({ copy, existingTables, onSaved, onContinue }: TablesStepProps) {
  const [drafts, setDrafts] = useState<DraftTable[]>(() =>
    existingTables.length > 0
      ? existingTables.map((table) => ({
          key: table.id,
          label: table.label,
          seats: table.seats
        }))
      : TABLE_TEMPLATES[0].tables.map((table, index) => ({
          key: `new-${index}`,
          label: table.label,
          seats: table.seats
        }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const alreadySaved = existingTables.length > 0;

  const totalSeats = useMemo(
    () => drafts.reduce((sum, draft) => sum + Math.max(0, draft.seats || 0), 0),
    [drafts]
  );
  const mix = useMemo(() => seatMixLabel(drafts), [drafts]);

  const applyTemplate = (id: "small" | "medium") => {
    const pack = TABLE_TEMPLATES.find((template) => template.id === id);
    if (!pack) {
      return;
    }
    setDrafts(
      pack.tables.map((table, index) => ({
        key: `tpl-${id}-${index}`,
        label: table.label,
        seats: table.seats
      }))
    );
  };

  const handleSave = async () => {
    if (alreadySaved) {
      onContinue();
      return;
    }
    const valid = drafts.filter((draft) => draft.label.trim() && draft.seats >= 1);
    if (valid.length === 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      for (const draft of valid) {
        await createTable({
          label: draft.label.trim(),
          seats: draft.seats,
          status: "AVAILABLE"
        });
      }
      showSuccess(copy.tablesSaved);
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
      <p className="text-sm text-muted-foreground">{copy.tablesWhy}</p>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{copy.tablesExample}</p>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>{copy.tablesTip1}</li>
        <li>{copy.tablesTip2}</li>
        <li>{copy.tablesTip3}</li>
      </ul>

      {alreadySaved ? (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">{copy.tablesAlreadyDone}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">{copy.tablesPickTemplate}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => applyTemplate("small")}>
              {copy.applySmall}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyTemplate("medium")}>
              {copy.applyMedium}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setDrafts((current) => [
                  ...current,
                  { key: `new-${Date.now()}`, label: `T${current.length + 1}`, seats: 2 }
                ])
              }
            >
              {copy.addTable}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md border px-3 py-2 text-sm">
        <span className="font-medium">
          {interpolate(copy.tablesSummary, { count: drafts.length, seats: totalSeats })}
        </span>
        {mix ? <span className="text-muted-foreground">{interpolate(copy.tablesMix, { mix })}</span> : null}
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_100px_auto] gap-2 px-1 text-xs font-medium text-muted-foreground">
          <span>{copy.tablesHeaderLabel}</span>
          <span>{copy.tablesHeaderSeats}</span>
          <span className="w-16" />
        </div>
        {drafts.map((draft, index) => (
          <div key={draft.key} className="grid grid-cols-[1fr_100px_auto] gap-2">
            <Input
              aria-label={copy.tableLabel}
              value={draft.label}
              disabled={alreadySaved}
              onChange={(event) => {
                const value = event.target.value;
                setDrafts((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, label: value } : item
                  )
                );
              }}
            />
            <Input
              type="number"
              min={1}
              aria-label={copy.tableSeats}
              value={draft.seats}
              disabled={alreadySaved}
              onChange={(event) => {
                const value = Number(event.target.value) || 1;
                setDrafts((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, seats: value } : item
                  )
                );
              }}
            />
            {alreadySaved ? (
              <span className="w-16" />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-16"
                onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
              >
                {copy.remove}
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button type="button" onClick={() => void handleSave()} disabled={isSubmitting || drafts.length === 0}>
        {isSubmitting ? copy.saving : alreadySaved ? copy.continue : copy.saveTables}
      </Button>
    </div>
  );
}
