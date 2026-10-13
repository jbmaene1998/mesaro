import { describe, expect, it } from "vitest";

import type { Shift } from "@/api/types";
import { buildSampleSlotsFromShifts, tomorrowInTimezone } from "@/features/onboarding/sampleSlots";

function shift(partial: Partial<Shift> & Pick<Shift, "dayOfWeek" | "startTime" | "lastReservationTime">): Shift {
  return {
    id: partial.id ?? "s1",
    restaurantId: "r1",
    name: partial.name ?? "Lunch",
    dayOfWeek: partial.dayOfWeek,
    dayOfWeekName: "Monday",
    startTime: partial.startTime,
    endTime: partial.endTime ?? "14:30",
    lastReservationTime: partial.lastReservationTime,
    maxCovers: 40,
    slotDurationMinutes: partial.slotDurationMinutes ?? 30,
    status: partial.status ?? "ACTIVE"
  };
}

describe("buildSampleSlotsFromShifts", () => {
  it("builds slots from start through last reservation for the given day", () => {
    const slots = buildSampleSlotsFromShifts(
      [
        shift({ dayOfWeek: 3, startTime: "12:00", lastReservationTime: "14:00", slotDurationMinutes: 30 }),
        shift({
          id: "s2",
          name: "Dinner",
          dayOfWeek: 3,
          startTime: "18:00",
          endTime: "22:00",
          lastReservationTime: "21:00",
          slotDurationMinutes: 60
        })
      ],
      3
    );

    expect(slots).toEqual(["12:00", "12:30", "13:00", "13:30", "14:00", "18:00", "19:00", "20:00"]);
  });

  it("ignores inactive shifts and other days", () => {
    const slots = buildSampleSlotsFromShifts(
      [
        shift({ dayOfWeek: 1, startTime: "12:00", lastReservationTime: "13:00", status: "INACTIVE" }),
        shift({ id: "s2", dayOfWeek: 2, startTime: "18:00", lastReservationTime: "19:00" })
      ],
      1
    );

    expect(slots).toEqual([]);
  });

  it("handles overnight last-reservation windows", () => {
    const slots = buildSampleSlotsFromShifts(
      [
        shift({
          dayOfWeek: 6,
          startTime: "22:00",
          endTime: "02:00",
          lastReservationTime: "01:00",
          slotDurationMinutes: 60
        })
      ],
      6,
      10
    );

    expect(slots).toEqual(["00:00", "01:00", "22:00", "23:00"]);
  });
});

describe("tomorrowInTimezone", () => {
  it("returns calendar tomorrow and ISO weekday in the restaurant zone", () => {
    // 2026-10-13 15:00 UTC = afternoon in Brussels (CEST, UTC+2) → tomorrow Wed 14
    const { date, dayOfWeek } = tomorrowInTimezone(
      "Europe/Brussels",
      new Date("2026-10-13T15:00:00.000Z")
    );
    expect(date).toBe("2026-10-14");
    expect(dayOfWeek).toBe(3);
  });
});
