import { format } from "date-fns";

import { apiClient, toAppError } from "@/api/client";
import type { ApiResponse, AppError, DiningTable, Reservation, ReservationStatus, Shift } from "@/api/types";
import { getRestaurantId } from "@/stores/restaurant-session";

export interface ReservationFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  statuses?: ReservationStatus[];
}

export interface ReservationDetail extends Reservation {
  tables: DiningTable[];
  shift: Shift;
  createdAt?: string;
}

export interface ReservationWithEtag {
  data: ReservationDetail;
  etag: string;
}

export interface CreateWalkInData {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  partySize: number;
  date: string;
  time: string;
  durationMinutes?: number;
  tableIds?: number[];
  combinationId?: number;
  notes?: string;
  seatImmediately?: boolean;
}

export interface UpdateReservationData {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  tableIds?: number[];
  notes?: string;
}

export type ReservationAction = "seat" | "complete" | "noshow" | "cancel";

export interface TableStatusItem extends Omit<DiningTable, "status"> {
  status: string;
  available?: boolean;
}

interface RawTableStatusItem {
  id?: number | string;
  restaurantId?: number | string;
  label?: string;
  seats?: number;
  status?: string;
  available?: boolean;
}

export function isTableAvailable(table: Pick<TableStatusItem, "status" | "available">) {
  if (typeof table.available === "boolean") {
    return table.available;
  }
  return table.status === "AVAILABLE";
}

export function tableAvailabilityLabel(table: Pick<TableStatusItem, "status" | "available">) {
  if (isTableAvailable(table)) {
    return "Available";
  }
  if (table.status === "UNAVAILABLE") {
    return "Unavailable";
  }
  return table.status || "Unavailable";
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

export async function getReservations(filters: ReservationFilters): Promise<Reservation[]> {
  const restaurantId = requireRestaurantId();

  const { data } = await apiClient.get<ApiResponse<Reservation[]> | Reservation[]>("/admin/reservations", {
    params: {
      restaurantId,
      date: filters.date,
      startDate: filters.startDate,
      endDate: filters.endDate,
      statuses: filters.statuses?.length ? filters.statuses.join(",") : undefined
    }
  });

  return unwrapResponse(data);
}

export async function getReservation(id: string): Promise<ReservationWithEtag> {
  const restaurantId = requireRestaurantId();

  const res = await apiClient.get<ApiResponse<ReservationDetail> | ReservationDetail>(`/admin/reservations/${id}`, {
    params: { restaurantId }
  });

  const rawEtag = res.headers["etag"];
  const etag = Array.isArray(rawEtag) ? (rawEtag[0] ?? "") : (rawEtag ?? "");

  return {
    data: unwrapResponse(res.data),
    etag
  };
}

export async function createWalkIn(payload: CreateWalkInData): Promise<Reservation> {
  const restaurantId = requireRestaurantId();

  try {
    const { data } = await apiClient.post<ApiResponse<Reservation> | Reservation>("/admin/reservations", payload, {
      params: { restaurantId }
    });

    return unwrapResponse(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function updateReservation(id: string, payload: UpdateReservationData, etag: string): Promise<Reservation> {
  const restaurantId = requireRestaurantId();

  const { data } = await apiClient.put<ApiResponse<Reservation> | Reservation>(`/admin/reservations/${id}`, payload, {
    params: { restaurantId },
    headers: {
      "If-Match": etag
    }
  });

  return unwrapResponse(data);
}

export async function updateStatus(id: string, action: ReservationAction, etag: string): Promise<Reservation> {
  const restaurantId = requireRestaurantId();

  const { data } = await apiClient.post<ApiResponse<Reservation> | Reservation>(
    `/admin/reservations/${id}/${action}`,
    undefined,
    {
      params: { restaurantId },
      headers: {
        "If-Match": etag
      }
    }
  );

  return unwrapResponse(data);
}

export async function switchTables(
  id: string,
  payload: { tableIds?: number[]; combinationId?: number },
  etag: string
): Promise<Reservation> {
  const restaurantId = requireRestaurantId();

  const { data } = await apiClient.post<ApiResponse<Reservation> | Reservation>(
    `/admin/reservations/${id}/switch`,
    payload,
    {
      params: { restaurantId },
      headers: {
        "If-Match": etag
      }
    }
  );

  return unwrapResponse(data);
}

export async function getTableStatus(params?: {
  date?: string;
  startTime?: string;
  endTime?: string;
}): Promise<TableStatusItem[]> {
  const restaurantId = requireRestaurantId();

  const { data } = await apiClient.get<ApiResponse<RawTableStatusItem[]> | RawTableStatusItem[]>(
    `/restaurants/${restaurantId}/tables/status`,
    {
      params: {
        date: params?.date,
        startTime: params?.startTime,
        endTime: params?.endTime
      }
    }
  );

  const payload = unwrapResponse(data);
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => ({
    id: String(item.id ?? ""),
    restaurantId: String(item.restaurantId ?? restaurantId),
    label: String(item.label ?? ""),
    seats: Number(item.seats ?? 0),
    status: String(item.status ?? "UNAVAILABLE"),
    available: typeof item.available === "boolean" ? item.available : undefined
  }));
}

export function defaultReservationDate() {
  return format(new Date(), "yyyy-MM-dd");
}
