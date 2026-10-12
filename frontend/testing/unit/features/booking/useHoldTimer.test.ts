import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHoldTimer } from "@/features/booking/hooks/useHoldTimer";

describe("useHoldTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down correctly", async () => {
    const { result } = renderHook(() =>
      useHoldTimer(new Date(Date.now() + 65_000).toISOString())
    );

    expect(result.current.formattedTime).toMatch(/^01:0[45]$/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(result.current.formattedTime).toMatch(/^0[01]:[0-5][0-9]$/);
  });

  it("returns isExpired when expiry is in the past", () => {
    const { result } = renderHook(() =>
      useHoldTimer(new Date(Date.now() - 1_000).toISOString())
    );

    expect(result.current.isExpired).toBe(true);
    expect(result.current.timeRemaining).toBe(0);
  });

  it("returns isWarning when under 60 seconds", () => {
    const { result } = renderHook(() =>
      useHoldTimer(new Date(Date.now() + 59_000).toISOString())
    );

    expect(result.current.isWarning).toBe(true);
  });
});
