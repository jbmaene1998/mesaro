import { useMemo, useState } from "react";

import type { DiningTable } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCombination, createTable } from "@/features/tables/api";
import {
  canCombineTables,
  DEFAULT_TABLE_AREA,
  SUGGESTED_TABLE_AREAS
} from "@/features/tables/tableArea";
import { TABLE_TEMPLATES } from "@/features/onboarding/templates";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { showApiError, showError, showSuccess } from "@/lib/toast";

interface DraftTable {
  key: string;
  label: string;
  seats: number;
  area: string;
  allowCrossAreaCombine: boolean;
}

interface DraftCombination {
  key: string;
  name: string;
  tableKeys: string[];
  minCapacity: number;
  maxCapacity: number;
}

interface TablesStepProps {
  copy: WizardCopy;
  existingTables: DiningTable[];
  onSaved: () => Promise<void>;
  onContinue: () => void;
}

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
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

function draftsFromTemplate(id: "small" | "medium"): { tables: DraftTable[]; combinations: DraftCombination[] } {
  const pack = TABLE_TEMPLATES.find((template) => template.id === id);
  if (!pack) {
    return { tables: [], combinations: [] };
  }
  const tables = pack.tables.map((table, index) => ({
    key: `tpl-${id}-${index}`,
    label: table.label,
    seats: table.seats,
    area: table.area?.trim() || DEFAULT_TABLE_AREA,
    allowCrossAreaCombine: table.allowCrossAreaCombine === true
  }));
  const labelToKey = new Map(tables.map((table) => [table.label, table.key]));
  const combinations = (pack.combinations ?? [])
    .map((combo, index) => {
      const tableKeys = combo.tableLabels
        .map((label) => labelToKey.get(label))
        .filter((key): key is string => Boolean(key));
      const totalSeats = tables
        .filter((table) => tableKeys.includes(table.key))
        .reduce((sum, table) => sum + table.seats, 0);
      return {
        key: `tpl-${id}-combo-${index}`,
        name: combo.name,
        tableKeys,
        minCapacity: combo.minCapacity ?? Math.max(1, Math.floor(totalSeats * 0.7)),
        maxCapacity: combo.maxCapacity ?? Math.max(1, totalSeats)
      };
    })
    .filter((combo) => combo.tableKeys.length >= 2);

  return { tables, combinations };
}

export function TablesStep({ copy, existingTables, onSaved, onContinue }: TablesStepProps) {
  const initial = draftsFromTemplate("small");
  const [drafts, setDrafts] = useState<DraftTable[]>(() =>
    existingTables.length > 0
      ? existingTables.map((table) => ({
          key: table.id,
          label: table.label,
          seats: table.seats,
          area: table.area?.trim() || DEFAULT_TABLE_AREA,
          allowCrossAreaCombine: table.allowCrossAreaCombine === true
        }))
      : initial.tables
  );
  const [combinations, setCombinations] = useState<DraftCombination[]>(() =>
    existingTables.length > 0 ? [] : initial.combinations
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const alreadySaved = existingTables.length > 0;

  const totalSeats = useMemo(
    () => drafts.reduce((sum, draft) => sum + Math.max(0, draft.seats || 0), 0),
    [drafts]
  );
  const mix = useMemo(() => seatMixLabel(drafts), [drafts]);

  const applyTemplate = (id: "small" | "medium") => {
    const next = draftsFromTemplate(id);
    setDrafts(next.tables);
    setCombinations(next.combinations);
  };

  const updateDraft = (index: number, patch: Partial<DraftTable>) => {
    setDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const removeDraft = (index: number) => {
    const removedKey = drafts[index]?.key;
    setDrafts((current) => current.filter((_, i) => i !== index));
    if (removedKey) {
      setCombinations((current) =>
        current
          .map((combo) => ({
            ...combo,
            tableKeys: combo.tableKeys.filter((key) => key !== removedKey)
          }))
          .filter((combo) => combo.tableKeys.length >= 2)
      );
    }
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

    for (const combo of combinations) {
      const members = valid.filter((draft) => combo.tableKeys.includes(draft.key));
      if (members.length < 2) {
        continue;
      }
      if (!canCombineTables(members)) {
        showError(interpolate(copy.combinationAreaConflict, { name: combo.name || copy.combinationName }));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const createdByKey = new Map<string, DiningTable>();
      for (const draft of valid) {
        const created = await createTable({
          label: draft.label.trim(),
          seats: draft.seats,
          status: "AVAILABLE",
          area: draft.area.trim() || DEFAULT_TABLE_AREA,
          allowCrossAreaCombine: draft.allowCrossAreaCombine
        });
        createdByKey.set(draft.key, created);
      }

      for (const combo of combinations) {
        const tableIds = combo.tableKeys
          .map((key) => createdByKey.get(key)?.id)
          .filter((id): id is string => Boolean(id));
        if (tableIds.length < 2 || !combo.name.trim()) {
          continue;
        }
        const members = combo.tableKeys
          .map((key) => createdByKey.get(key))
          .filter((table): table is DiningTable => Boolean(table));
        const seats = members.reduce((sum, table) => sum + table.seats, 0);
        await createCombination({
          name: combo.name.trim(),
          tableIds: tableIds.map((id) => Number(id)),
          minCapacity: Math.min(combo.minCapacity, seats),
          maxCapacity: Math.min(Math.max(combo.maxCapacity, combo.minCapacity), seats)
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
                  {
                    key: `new-${Date.now()}`,
                    label: `T${current.length + 1}`,
                    seats: 2,
                    area: DEFAULT_TABLE_AREA,
                    allowCrossAreaCombine: false
                  }
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

      <div className="space-y-3">
        {drafts.map((draft, index) => (
          <div key={draft.key} className="space-y-2 rounded-md border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_90px_1fr_auto]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor={`table-label-${draft.key}`}>
                  {copy.tableLabel}
                </label>
                <Input
                  id={`table-label-${draft.key}`}
                  value={draft.label}
                  disabled={alreadySaved}
                  onChange={(event) => updateDraft(index, { label: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor={`table-seats-${draft.key}`}>
                  {copy.tableSeats}
                </label>
                <Input
                  id={`table-seats-${draft.key}`}
                  type="number"
                  min={1}
                  value={draft.seats}
                  disabled={alreadySaved}
                  onChange={(event) => updateDraft(index, { seats: Number(event.target.value) || 1 })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor={`table-area-${draft.key}`}>
                  {copy.tableArea}
                </label>
                <Input
                  id={`table-area-${draft.key}`}
                  list="onboarding-table-areas"
                  value={draft.area}
                  disabled={alreadySaved}
                  onChange={(event) => updateDraft(index, { area: event.target.value })}
                />
              </div>
              {alreadySaved ? (
                <span className="hidden sm:block" />
              ) : (
                <Button type="button" variant="ghost" size="sm" className="mt-5" onClick={() => removeDraft(index)}>
                  {copy.remove}
                </Button>
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.allowCrossAreaCombine}
                disabled={alreadySaved}
                onChange={(event) => updateDraft(index, { allowCrossAreaCombine: event.target.checked })}
              />
              {copy.tableAllowCrossArea}
            </label>
          </div>
        ))}
        <datalist id="onboarding-table-areas">
          {SUGGESTED_TABLE_AREAS.map((area) => (
            <option key={area} value={area} />
          ))}
        </datalist>
      </div>

      {!alreadySaved ? (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{copy.combinationsTitle}</p>
              <p className="text-xs text-muted-foreground">{copy.combinationsHint}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCombinations((current) => [
                  ...current,
                  {
                    key: `combo-${Date.now()}`,
                    name: `Combo ${current.length + 1}`,
                    tableKeys: drafts.slice(0, 2).map((draft) => draft.key),
                    minCapacity: 2,
                    maxCapacity: 4
                  }
                ])
              }
              disabled={drafts.length < 2}
            >
              {copy.addCombination}
            </Button>
          </div>

          {combinations.length === 0 ? (
            <p className="text-xs text-muted-foreground">{copy.combinationsEmpty}</p>
          ) : (
            combinations.map((combo, comboIndex) => {
              const members = drafts.filter((draft) => combo.tableKeys.includes(draft.key));
              const areaOk = members.length < 2 || canCombineTables(members);
              const seats = members.reduce((sum, draft) => sum + draft.seats, 0);
              return (
                <div key={combo.key} className="space-y-2 rounded-md border bg-muted/10 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-[160px] flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`combo-name-${combo.key}`}>
                        {copy.combinationName}
                      </label>
                      <Input
                        id={`combo-name-${combo.key}`}
                        value={combo.name}
                        onChange={(event) =>
                          setCombinations((current) =>
                            current.map((item, index) =>
                              index === comboIndex ? { ...item, name: event.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-5"
                      onClick={() => setCombinations((current) => current.filter((_, i) => i !== comboIndex))}
                    >
                      {copy.remove}
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{copy.combinationTables}</p>
                    <div className="flex flex-wrap gap-2">
                      {drafts.map((draft) => {
                        const selected = combo.tableKeys.includes(draft.key);
                        return (
                          <label
                            key={draft.key}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                              selected ? "border-primary bg-primary/5" : "text-muted-foreground"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) => {
                                setCombinations((current) =>
                                  current.map((item, index) => {
                                    if (index !== comboIndex) {
                                      return item;
                                    }
                                    const tableKeys = event.target.checked
                                      ? [...item.tableKeys, draft.key]
                                      : item.tableKeys.filter((key) => key !== draft.key);
                                    return { ...item, tableKeys };
                                  })
                                );
                              }}
                            />
                            {draft.label || "?"} · {draft.area || DEFAULT_TABLE_AREA}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid max-w-sm grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`combo-min-${combo.key}`}>
                        {copy.combinationMin}
                      </label>
                      <Input
                        id={`combo-min-${combo.key}`}
                        type="number"
                        min={1}
                        value={combo.minCapacity}
                        onChange={(event) =>
                          setCombinations((current) =>
                            current.map((item, index) =>
                              index === comboIndex
                                ? { ...item, minCapacity: Math.max(1, Number(event.target.value) || 1) }
                                : item
                            )
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`combo-max-${combo.key}`}>
                        {copy.combinationMax}
                      </label>
                      <Input
                        id={`combo-max-${combo.key}`}
                        type="number"
                        min={1}
                        value={combo.maxCapacity}
                        onChange={(event) =>
                          setCombinations((current) =>
                            current.map((item, index) =>
                              index === comboIndex
                                ? { ...item, maxCapacity: Math.max(1, Number(event.target.value) || 1) }
                                : item
                            )
                          )
                        }
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {interpolate(copy.combinationSeats, { seats })}
                    {!areaOk ? ` · ${copy.combinationAreaConflictShort}` : null}
                  </p>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      <Button type="button" onClick={() => void handleSave()} disabled={isSubmitting || drafts.length === 0}>
        {isSubmitting ? copy.saving : alreadySaved ? copy.continue : copy.saveTables}
      </Button>
    </div>
  );
}
