import { describe, expect, it } from "vitest";

import { durationOptionsMinutes, isOvernightRange, isTimeWithinRange } from "@/lib/date";

describe("durationOptionsMinutes", () => {
  it("includes the restaurant default alongside standard options", () => {
    expect(durationOptionsMinutes(75)).toEqual([60, 75, 90, 120]);
  });

  it("falls back to 90 when default is missing", () => {
    expect(durationOptionsMinutes(undefined)).toEqual([60, 90, 120]);
  });
});

describe("overnight helpers", () => {
  it("detects overnight ranges", () => {
    expect(isOvernightRange("18:00", "02:00")).toBe(true);
    expect(isOvernightRange("11:00", "15:00")).toBe(false);
  });

  it("treats early-morning times as inside overnight shifts", () => {
    expect(isTimeWithinRange("00:30", "18:00", "02:00")).toBe(true);
    expect(isTimeWithinRange("12:00", "18:00", "02:00")).toBe(false);
  });
});
