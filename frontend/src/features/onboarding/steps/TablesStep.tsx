import { useState } from "react";

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
    if (existingTables.length >= 1) {
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
      {existingTables.length === 0 ? (
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
      ) : null}
      <div className="space-y-2">
        {drafts.map((draft, index) => (
          <div key={draft.key} className="grid grid-cols-[1fr_100px_auto] gap-2">
            <Input
              aria-label={copy.tableLabel}
              value={draft.label}
              disabled={existingTables.length > 0}
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
              disabled={existingTables.length > 0}
              onChange={(event) => {
                const value = Number(event.target.value) || 1;
                setDrafts((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, seats: value } : item
                  )
                );
              }}
            />
            {existingTables.length === 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
              >
                {copy.remove}
              </Button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
      <Button type="button" onClick={() => void handleSave()} disabled={isSubmitting || drafts.length === 0}>
        {isSubmitting ? copy.saving : existingTables.length > 0 ? copy.continue : copy.saveTables}
      </Button>
    </div>
  );
}
