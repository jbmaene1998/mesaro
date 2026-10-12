import { format } from "date-fns";

import { apiClient } from "@/api/client";
import type { ApiResponse, AppError, ReservationStatus, TableStatus } from "@/api/types";
import { getRestaurantId } from "@/stores/restaurant-session";

export interface TimelineTable {
  id: number;
  label: string;
  seats: number;
  status: TableStatus;
}

export interface TimelineReservation {
  id: string;
  confirmationCode: string;
  startTime: string;
  endTime: string;
  guestName: string;
  partySize: number;
  status: ReservationStatus;
  shiftName: string | null;
  tableLabels: string[];
}

export interface TimelineShift {
  name: string;
  startTime: string;
  endTime: string;
}

export interface TimelineData {
  restaurantId?: number;
  restaurantName?: string;
  timezone?: string;
  date?: string;
  tables: TimelineTable[];
  reservations: TimelineReservation[];
  shifts: TimelineShift[];
  slotDurationMinutes?: number;
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

function requireRestaurantId() {
  const restaurantId = getRestaurantId();
  if (!restaurantId) {
    throw new Error("No restaurant selected");
  }
  return restaurantId;
}

interface BackendTimelineTable {
  id?: number;
  label?: string;
  seats?: number;
  status?: string;
}

interface BackendTimelineReservation {
  id?: number | string;
  confirmationCode?: string;
  startTime?: string;
  endTime?: string;
  guestName?: string;
  partySize?: number;
  status?: string;
  shiftName?: string | null;
  tableLabels?: string[];
}

interface BackendTimelineResponse {
  restaurantId?: number;
  restaurantName?: string;
  timezone?: string;
  date?: string;
  tables?: BackendTimelineTable[];
  reservations?: BackendTimelineReservation[];
}

function normalizeTime(value: string | undefined) {
  if (!value) {
    return "";
  }
  const parts = value.split(":");
  if (parts.length < 2) {
    return value;
  }
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

export async function getTimeline(date: string): Promise<TimelineData> {
  const restaurantId = requireRestaurantId();
  const effectiveDate = date || format(new Date(), "yyyy-MM-dd");

  const { data } = await apiClient.get<ApiResponse<BackendTimelineResponse> | BackendTimelineResponse>("/timeline", {
    params: {
      restaurantId,
      date: effectiveDate
    }
  });

  const timeline = unwrapResponse(data) as BackendTimelineResponse;

  return {
    restaurantId: typeof timeline.restaurantId === "number" ? timeline.restaurantId : undefined,
    restaurantName: typeof timeline.restaurantName === "string" ? timeline.restaurantName : undefined,
    timezone: typeof timeline.timezone === "string" ? timeline.timezone : undefined,
    date: typeof timeline.date === "string" ? timeline.date : undefined,
    tables: Array.isArray(timeline.tables)
      ? timeline.tables
          .filter((table): table is Required<Pick<BackendTimelineTable, "id" | "label" | "seats" | "status">> =>
            typeof table.id === "number"
            && typeof table.label === "string"
            && typeof table.seats === "number"
            && typeof table.status === "string")
          .map((table) => ({
            id: table.id,
            label: table.label,
            seats: table.seats,
            status: table.status === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE"
          }))
      : [],
    // Backend timeline DTO currently does not provide shifts; keep a stable empty default.
    shifts: [],
    // Backend timeline DTO currently does not provide slot duration; TimelinePage applies 30m default.
    slotDurationMinutes: undefined,
    reservations: Array.isArray(timeline.reservations)
      ? timeline.reservations.map((reservation) => ({
          id: String(reservation.id ?? ""),
          confirmationCode: String(reservation.confirmationCode ?? ""),
          startTime: normalizeTime(typeof reservation.startTime === "string" ? reservation.startTime : undefined),
          endTime: normalizeTime(typeof reservation.endTime === "string" ? reservation.endTime : undefined),
          guestName: String(reservation.guestName ?? ""),
          partySize: Number(reservation.partySize ?? 0),
          status: (reservation.status ?? "CONFIRMED") as ReservationStatus,
          shiftName: typeof reservation.shiftName === "string" ? reservation.shiftName : null,
          tableLabels: Array.isArray(reservation.tableLabels)
            ? reservation.tableLabels.filter((label): label is string => typeof label === "string")
            : []
        }))
      : []
  };
}
