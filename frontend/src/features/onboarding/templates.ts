export interface TableTemplateItem {
  label: string;
  seats: number;
}

export interface TableTemplatePack {
  id: "small" | "medium";
  tables: TableTemplateItem[];
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
      { label: "T1", seats: 2 },
      { label: "T2", seats: 2 },
      { label: "T3", seats: 2 },
      { label: "T4", seats: 2 },
      { label: "T5", seats: 4 },
      { label: "T6", seats: 4 }
    ]
  },
  {
    id: "medium",
    tables: [
      { label: "T1", seats: 2 },
      { label: "T2", seats: 2 },
      { label: "T3", seats: 2 },
      { label: "T4", seats: 2 },
      { label: "T5", seats: 4 },
      { label: "T6", seats: 4 },
      { label: "T7", seats: 4 },
      { label: "T8", seats: 6 },
      { label: "T9", seats: 6 },
      { label: "T10", seats: 8 }
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
