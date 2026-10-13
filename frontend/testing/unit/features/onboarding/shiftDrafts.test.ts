import { describe, expect, it } from "vitest";

import {
  createBlankShiftDraft,
  draftsFromPack,
  expandDraftWindows,
  SHIFT_TEMPLATES,
  type ShiftDraftWindow
} from "@/features/onboarding/templates";

describe("draftsFromPack", () => {
  it("seeds one draft window per pack window with the pack days", () => {
    const pack = SHIFT_TEMPLATES.find((item) => item.id === "weekday-lunch-dinner");
    expect(pack).toBeDefined();
    const drafts = draftsFromPack(pack!, "weekday");

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      key: "weekday-0",
      name: "Lunch",
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "12:00",
      endTime: "14:30",
      lastReservationTime: "14:00",
      maxCovers: 40,
      slotDurationMinutes: 15
    });
    expect(drafts[1].name).toBe("Dinner");
    expect(drafts[1].daysOfWeek).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("expandDraftWindows", () => {
  it("expands each selected day into its own shift payload", () => {
    const drafts: ShiftDraftWindow[] = [
      {
        key: "lunch",
        name: "Lunch",
        daysOfWeek: [1, 3],
        startTime: "12:00",
        endTime: "14:30",
        lastReservationTime: "14:00",
        maxCovers: 40,
        slotDurationMinutes: 15
      }
    ];

    expect(expandDraftWindows(drafts)).toEqual([
      {
        name: "Lunch",
        dayOfWeek: 1,
        startTime: "12:00",
        endTime: "14:30",
        lastReservationTime: "14:00",
        maxCovers: 40,
        slotDurationMinutes: 15
      },
      {
        name: "Lunch",
        dayOfWeek: 3,
        startTime: "12:00",
        endTime: "14:30",
        lastReservationTime: "14:00",
        maxCovers: 40,
        slotDurationMinutes: 15
      }
    ]);
  });

  it("excludes days that are toggled off and drops empty day lists", () => {
    const drafts: ShiftDraftWindow[] = [
      {
        ...createBlankShiftDraft("closed"),
        name: "Brunch",
        daysOfWeek: [],
        startTime: "10:00",
        endTime: "13:00",
        lastReservationTime: "12:30",
        maxCovers: 25
      },
      {
        ...createBlankShiftDraft("dinner"),
        name: "Dinner",
        daysOfWeek: [6, 7],
        startTime: "18:00",
        endTime: "22:30",
        lastReservationTime: "21:30",
        maxCovers: 80
      }
    ];

    const expanded = expandDraftWindows(drafts);
    expect(expanded).toHaveLength(2);
    expect(expanded.every((shift) => shift.name === "Dinner")).toBe(true);
    expect(expanded.map((shift) => shift.dayOfWeek)).toEqual([6, 7]);
  });

  it("trims names and clamps covers", () => {
    const expanded = expandDraftWindows([
      {
        ...createBlankShiftDraft("x"),
        name: "  Late  ",
        daysOfWeek: [5],
        maxCovers: 0
      }
    ]);

    expect(expanded).toEqual([
      expect.objectContaining({
        name: "Late",
        dayOfWeek: 5,
        maxCovers: 1
      })
    ]);
  });
});
