import { describe, expect, it } from "vitest";

import { utcOffsetMinutesForSlot } from "@/features/booking/api";

describe("utcOffsetMinutesForSlot", () => {
  it("derives CET offset from local wall and UTC instant", () => {
    const offset = utcOffsetMinutesForSlot(
      "2026-01-15",
      "12:00",
      "2026-01-15T11:00:00Z"
    );
    expect(offset).toBe(60);
  });

  it("returns undefined when timeUtc is missing", () => {
    expect(utcOffsetMinutesForSlot("2026-01-15", "12:00")).toBeUndefined();
  });
});
