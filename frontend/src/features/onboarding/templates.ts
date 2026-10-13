export interface TableTemplateItem {
  label: string;
  seats: number;
  area?: string;
  allowCrossAreaCombine?: boolean;
}

export interface TableCombinationTemplate {
  name: string;
  tableLabels: string[];
  minCapacity?: number;
  maxCapacity?: number;
}

export interface TableTemplatePack {
  id: "small" | "medium";
  tables: TableTemplateItem[];
  combinations?: TableCombinationTemplate[];
}

export interface ShiftWindowTemplate {
  name: string;
  startTime: string;
  endTime: string;
  lastReservationTime: string;
  maxCovers: number;
  slotDurationMinutes: number;
}

export interface ShiftTemplatePack {
  id: "weekday-lunch-dinner" | "weekend-dinner";
  daysOfWeek: number[];
  windows: ShiftWindowTemplate[];
}

export const TABLE_TEMPLATES: TableTemplatePack[] = [
  {
    id: "small",
    tables: [
      { label: "T1", seats: 2, area: "Main hall" },
      { label: "T2", seats: 2, area: "Main hall" },
      { label: "T3", seats: 2, area: "Main hall" },
      { label: "T4", seats: 2, area: "Main hall" },
      { label: "T5", seats: 4, area: "Main hall" },
      { label: "T6", seats: 4, area: "Main hall" }
    ],
    combinations: [
      { name: "T1+T2", tableLabels: ["T1", "T2"], minCapacity: 3, maxCapacity: 4 },
      { name: "T5+T6", tableLabels: ["T5", "T6"], minCapacity: 5, maxCapacity: 8 }
    ]
  },
  {
    id: "medium",
    tables: [
      { label: "T1", seats: 2, area: "Main hall" },
      { label: "T2", seats: 2, area: "Main hall" },
      { label: "T3", seats: 2, area: "Main hall" },
      { label: "T4", seats: 2, area: "Main hall" },
      { label: "T5", seats: 4, area: "Main hall" },
      { label: "T6", seats: 4, area: "Main hall" },
      { label: "T7", seats: 4, area: "Main hall" },
      { label: "TE1", seats: 2, area: "Terrace" },
      { label: "TE2", seats: 2, area: "Terrace" },
      { label: "TE3", seats: 4, area: "Terrace" }
    ],
    combinations: [
      { name: "Hall T1+T2", tableLabels: ["T1", "T2"], minCapacity: 3, maxCapacity: 4 },
      { name: "Hall T5+T6", tableLabels: ["T5", "T6"], minCapacity: 5, maxCapacity: 8 },
      { name: "Terrace TE1+TE2", tableLabels: ["TE1", "TE2"], minCapacity: 3, maxCapacity: 4 }
    ]
  }
];

export const SHIFT_TEMPLATES: ShiftTemplatePack[] = [
  {
    id: "weekday-lunch-dinner",
    daysOfWeek: [1, 2, 3, 4, 5],
    windows: [
      {
        name: "Lunch",
        startTime: "12:00",
        endTime: "14:30",
        lastReservationTime: "14:00",
        maxCovers: 40,
        slotDurationMinutes: 15
      },
      {
        name: "Dinner",
        startTime: "18:00",
        endTime: "22:00",
        lastReservationTime: "21:00",
        maxCovers: 60,
        slotDurationMinutes: 15
      }
    ]
  },
  {
    id: "weekend-dinner",
    daysOfWeek: [6, 7],
    windows: [
      {
        name: "Dinner",
        startTime: "18:00",
        endTime: "22:30",
        lastReservationTime: "21:30",
        maxCovers: 80,
        slotDurationMinutes: 15
      }
    ]
  }
];

export function expandShiftTemplate(pack: ShiftTemplatePack) {
  return pack.daysOfWeek.flatMap((dayOfWeek) =>
    pack.windows.map((window) => ({
      name: window.name,
      dayOfWeek,
      startTime: window.startTime,
      endTime: window.endTime,
      lastReservationTime: window.lastReservationTime,
      maxCovers: window.maxCovers,
      slotDurationMinutes: window.slotDurationMinutes
    }))
  );
}

/** Editable service window used in the go-live shifts step. */
export interface ShiftDraftWindow {
  key: string;
  name: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  lastReservationTime: string;
  maxCovers: number;
  slotDurationMinutes: number;
}

export function createBlankShiftDraft(key: string): ShiftDraftWindow {
  return {
    key,
    name: "Dinner",
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "18:00",
    endTime: "22:00",
    lastReservationTime: "21:00",
    maxCovers: 40,
    slotDurationMinutes: 15
  };
}

export function draftsFromPack(pack: ShiftTemplatePack, keyPrefix: string): ShiftDraftWindow[] {
  return pack.windows.map((window, index) => ({
    key: `${keyPrefix}-${index}`,
    name: window.name,
    daysOfWeek: [...pack.daysOfWeek],
    startTime: window.startTime,
    endTime: window.endTime,
    lastReservationTime: window.lastReservationTime,
    maxCovers: window.maxCovers,
    slotDurationMinutes: window.slotDurationMinutes
  }));
}

export function defaultShiftDrafts(): ShiftDraftWindow[] {
  const pack = SHIFT_TEMPLATES.find((item) => item.id === "weekday-lunch-dinner");
  if (!pack) {
    return [createBlankShiftDraft("default-0")];
  }
  return draftsFromPack(pack, "weekday");
}

/** Expand draft windows into per-day shift payloads for preview and bulk create. */
export function expandDraftWindows(drafts: ShiftDraftWindow[]) {
  return drafts.flatMap((draft) => {
    const name = draft.name.trim() || "Service";
    const maxCovers = Math.max(1, Number(draft.maxCovers) || 1);
    const slotDurationMinutes = draft.slotDurationMinutes > 0 ? draft.slotDurationMinutes : 15;
    const days = [...new Set(draft.daysOfWeek.filter((day) => day >= 1 && day <= 7))].sort(
      (a, b) => a - b
    );

    return days.map((dayOfWeek) => ({
      name,
      dayOfWeek,
      startTime: draft.startTime,
      endTime: draft.endTime,
      lastReservationTime: draft.lastReservationTime,
      maxCovers,
      slotDurationMinutes
    }));
  });
}
