import { formatInTimeZone } from "date-fns-tz";

import type { Shift } from "@/api/types";
import { timeToMinutes } from "@/lib/date";

function minutesToHhMm(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Calendar tomorrow (YYYY-MM-DD) and ISO day-of-week (1=Mon…7=Sun) in a restaurant timezone. */
export function tomorrowInTimezone(timeZone: string, now = new Date()): { date: string; dayOfWeek: number } {
  const zone = timeZone.trim() || "UTC";
  const todayStr = formatInTimeZone(now, zone, "yyyy-MM-dd");
  const [year, month, day] = todayStr.split("-").map(Number);
  const tomorrowUtc = new Date(Date.UTC(year, month - 1, day + 1));
  const date = tomorrowUtc.toISOString().slice(0, 10);
  const utcDay = tomorrowUtc.getUTCDay();
  const dayOfWeek = utcDay === 0 ? 7 : utcDay;
  return { date, dayOfWeek };
}

/** Minimal shift shape for sample-slot preview (saved shifts or expanded drafts). */
export type SampleSlotSource = Pick<
  Shift,
  "dayOfWeek" | "startTime" | "endTime" | "lastReservationTime" | "slotDurationMinutes"
> & {
  status?: Shift["status"];
};

/**
 * Guest-style sample start times for a given ISO day of week.
 * Used in onboarding before online booking is enabled (public /availability returns empty then).
 */
export function buildSampleSlotsFromShifts(
  shifts: SampleSlotSource[],
  dayOfWeek: number,
  limit = 8
): string[] {
  const times: string[] = [];

  for (const shift of shifts) {
    if (shift.status && shift.status !== "ACTIVE") {
      continue;
    }
    if (shift.dayOfWeek !== dayOfWeek) {
      continue;
    }

    const start = timeToMinutes(shift.startTime);
    const last = timeToMinutes(shift.lastReservationTime || shift.endTime);
    const step = shift.slotDurationMinutes > 0 ? shift.slotDurationMinutes : 15;
    if (start === null || last === null) {
      continue;
    }

    if (last >= start) {
      for (let minute = start; minute <= last; minute += step) {
        times.push(minutesToHhMm(minute));
      }
    } else {
      for (let minute = start; minute < 24 * 60; minute += step) {
        times.push(minutesToHhMm(minute));
      }
      for (let minute = 0; minute <= last; minute += step) {
        times.push(minutesToHhMm(minute));
      }
    }
  }

  return [...new Set(times)].sort().slice(0, limit);
}
