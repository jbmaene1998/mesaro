import { format } from "date-fns";

import { apiClient, toAppError } from "@/api/client";
import type { ApiResponse, AppError, ReservationStatus } from "@/api/types";

export interface AvailabilitySlot {
  /** Raw time from the API (may include seconds). Used for hold/create requests. */
  time: string;
  /** Guest-facing label (HH:mm). */
  displayTime: string;
  /** UTC instant from API when present (ISO-8601). */
  timeUtc?: string;
  shift: string;
  available: boolean;
  unavailableReason?: string;
}

/** Strip seconds from API times like `18:30:00` for display only. */
export function formatSlotTimeForDisplay(time: string): string {
  const trimmed = time.trim();
  const match = /^(\d{1,2}:\d{2}):\d{2}$/.exec(trimmed);
  if (match) {
    return match[1];
  }
  return trimmed;
}

export interface HoldResponse {
  holdToken: string;
  expiresAt: string;
}

export interface GuestInfo {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  notes?: string;
}

export interface ReservationConfirmation {
  confirmationCode: string;
  cancelToken: string;
  cancelTokenExpiresAt: string;
  guestName: string;
  guestEmail: string;
  partySize: number;
  date: string;
  time: string;
  timezone: string;
  shiftName: string;
  tableLabels: string[];
}

export interface GuestReservation {
  confirmationCode: string;
  partySize: number;
  date: string;
  time: string;
  timezone: string;
  status: ReservationStatus;
  shiftName: string | null;
  tableLabels: string[];
}

interface AvailabilityPayload {
  restaurantName?: string;
  restaurantSlug?: string;
  timezone?: string;
  locale?: string;
  minNoticeMinutes?: number;
  maxAdvanceDays?: number;
  maxPartySize?: number;
  slots?: Array<{
    time: string;
    timeUtc?: string;
    shift?: string;
    shiftName?: string;
    available: boolean;
    unavailableReason?: string;
  }>;
}

interface ClosedPayload {
  closed?: boolean;
  reason?: string;
  closedReason?: string;
}

interface RestaurantMeta {
  name: string;
  slug: string;
  timezone: string;
  locale: string;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  maxPartySize: number;
}

function unwrapResponse<T>(response: ApiResponse<T> | T): T {
  if (typeof response === "object" && response !== null && "success" in response) {
    const envelope = response as ApiResponse<T>;
    if (envelope.success && envelope.data !== null) {
      return envelope.data;
    }

    const appError: AppError = {
      status: 400,
      code: envelope.error?.code ?? "UNKNOWN",
      message: envelope.error?.message ?? envelope.message ?? "Request failed",
      field: envelope.error?.field,
      timestamp: envelope.timestamp
    };

    throw appError;
  }

  return response as T;
}

async function fetchAvailabilityPayload(slug: string, date: string, partySize: number) {
  const { data } = await apiClient.get<ApiResponse<AvailabilityPayload> | AvailabilityPayload>("/availability", {
    params: {
      restaurantSlug: slug,
      date,
      partySize
    }
  });

  return unwrapResponse(data);
}

export async function getRestaurantBySlug(slug: string): Promise<RestaurantMeta> {
  const today = format(new Date(), "yyyy-MM-dd");
  const payload = await fetchAvailabilityPayload(slug, today, 1);

  return {
    name: payload.restaurantName ?? slug,
    slug: payload.restaurantSlug ?? slug,
    timezone: payload.timezone ?? "UTC",
    locale: payload.locale ?? "en",
    minNoticeMinutes: payload.minNoticeMinutes ?? 0,
    maxAdvanceDays: payload.maxAdvanceDays ?? 90,
    maxPartySize: payload.maxPartySize ?? 20
  };
}

export async function checkClosed(slug: string, date: string): Promise<{ closed: boolean; reason?: string }> {
  const { data } = await apiClient.get<ApiResponse<ClosedPayload> | ClosedPayload>("/availability/closed", {
    params: {
      restaurantSlug: slug,
      date
    }
  });

  const payload = unwrapResponse(data);
  return {
    closed: Boolean(payload.closed),
    reason: payload.reason ?? payload.closedReason
  };
}

export async function getAvailability(slug: string, date: string, partySize: number): Promise<AvailabilitySlot[]> {
  const payload = await fetchAvailabilityPayload(slug, date, partySize);

  return (payload.slots ?? []).map((slot) => ({
    time: slot.time,
    displayTime: formatSlotTimeForDisplay(slot.time),
    timeUtc: slot.timeUtc,
    shift: slot.shift ?? slot.shiftName ?? "General",
    available: slot.available,
    unavailableReason: slot.unavailableReason
  }));
}

/**
 * Offset minutes for hold/create so DST ambiguous local times resolve the same way
 * as availability (local wall clock minus the slot's UTC Instant).
 */
export function utcOffsetMinutesForSlot(date: string, time: string, timeUtc?: string): number | undefined {
  if (!timeUtc) {
    return undefined;
  }
  const utcMs = Date.parse(timeUtc);
  if (Number.isNaN(utcMs)) {
    return undefined;
  }
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = formatSlotTimeForDisplay(time).split(":").map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) {
    return undefined;
  }
  const asUtc = Date.UTC(y, m - 1, d, hh, mm, 0);
  return Math.round((asUtc - utcMs) / 60_000);
}

export async function createHold(
  slug: string,
  date: string,
  time: string,
  partySize: number,
  utcOffsetMinutes?: number
): Promise<HoldResponse> {
  const { data } = await apiClient.post<ApiResponse<HoldResponse> | HoldResponse>("/holds", {
    restaurantSlug: slug,
    date,
    time,
    partySize,
    ...(utcOffsetMinutes !== undefined ? { utcOffsetMinutes } : {})
  });

  return unwrapResponse(data);
}

export async function confirmHold(
  holdToken: string,
  guestInfo: GuestInfo
): Promise<ReservationConfirmation> {
  try {
    const { data } = await apiClient.post<ApiResponse<ReservationConfirmation> | ReservationConfirmation>(
      "/holds/confirm",
      {
        holdToken,
        ...guestInfo
      }
    );

    return unwrapResponse(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function getReservationByCode(code: string, cancelToken: string): Promise<GuestReservation> {
  const { data } = await apiClient.get<ApiResponse<GuestReservation> | GuestReservation>(`/reservations/${code}`, {
    headers: {
      "X-Cancel-Token": cancelToken
    }
  });

  return unwrapResponse(data);
}

export async function cancelReservation(code: string, cancelToken: string): Promise<GuestReservation> {
  const { data } = await apiClient.post<ApiResponse<GuestReservation> | GuestReservation>(`/reservations/${code}/cancel`, null, {
    headers: {
      "X-Cancel-Token": cancelToken
    }
  });

  return unwrapResponse(data);
}

