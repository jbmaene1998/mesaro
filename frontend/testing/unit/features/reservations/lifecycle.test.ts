import { describe, expect, it } from "vitest";

import type { Reservation } from "@/api/types";
import { canMarkNoShow, canSeatReservation } from "@/features/reservations/lifecycle";

function reservation(partial: Partial<Reservation>): Reservation {
  return {
    id: "1",
    confirmationCode: "ABC",
    guestName: "Guest",
    guestEmail: "g@example.com",
    guestPhone: "",
    partySize: 2,
    date: "2026-10-14",
    time: "19:00",
    timezone: "Europe/Brussels",
    startAtUtc: "2026-10-14T17:00:00.000Z",
    endAtUtc: "2026-10-14T18:30:00.000Z",
    status: "CONFIRMED",
    shiftName: "Dinner",
    tableLabels: ["T1"],
    notes: null,
    ...partial
  };
}

describe("canSeatReservation", () => {
  it("blocks seating the day before service day", () => {
    const decision = canSeatReservation(
      reservation({}),
      new Date("2026-10-13T15:00:00.000Z")
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/service day/i);
  });

  it("allows seating on the service day before start", () => {
    const decision = canSeatReservation(
      reservation({}),
      new Date("2026-10-14T08:00:00.000Z")
    );
    expect(decision.allowed).toBe(true);
  });

  it("blocks seating after end time", () => {
    const decision = canSeatReservation(
      reservation({}),
      new Date("2026-10-14T18:30:00.000Z")
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/end time/i);
  });
});

describe("canMarkNoShow", () => {
  it("blocks no-show before start", () => {
    const decision = canMarkNoShow(
      reservation({}),
      new Date("2026-10-14T16:59:00.000Z")
    );
    expect(decision.allowed).toBe(false);
  });

  it("allows no-show at start", () => {
    const decision = canMarkNoShow(
      reservation({}),
      new Date("2026-10-14T17:00:00.000Z")
    );
    expect(decision.allowed).toBe(true);
  });
});
