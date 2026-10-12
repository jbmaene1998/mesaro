import { formatInTimeZone } from "date-fns-tz";

export function formatRestaurantDate(date: Date, timeZone = "America/New_York") {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd HH:mm zzz");
}

/** Normalize API LocalTime values (`HH:mm:ss`) for `<input type="time">` and comparisons. */
export function normalizeLocalTime(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(trimmed);
  if (!match) {
    return trimmed;
  }
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/** Build a local datetime string safe for Date / date-fns-tz parsing. */
export function toLocalDateTime(date: string, time: string): string {
  const normalized = normalizeLocalTime(time);
  if (!normalized) {
    return `${date}T00:00:00`;
  }
  return `${date}T${normalized}:00`;
}

/** Compare clock times as minutes since midnight (handles HH:mm and HH:mm:ss). */
export function timeToMinutes(value: string | null | undefined): number | null {
  const normalized = normalizeLocalTime(value);
  if (!normalized) {
    return null;
  }
  const [hours, minutes] = normalized.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

export function isTimeWithinRange(time: string, start: string, end: string): boolean {
  const t = timeToMinutes(time);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (t === null || s === null || e === null) {
    return false;
  }
  if (e <= s) {
    // Overnight shift: time is in range if >= start OR < end
    return t >= s || t < e;
  }
  return t >= s && t < e;
}
