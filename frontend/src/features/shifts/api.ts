import { apiClient } from "@/api/client";
import type { ApiResponse, AppError, Shift, ShiftStatus } from "@/api/types";
import { getRestaurantId } from "@/stores/restaurant-session";

export interface ShiftFormPayload {
  name: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  lastReservationTime: string;
  maxCovers: number;
  slotDurationMinutes: number;
  status: ShiftStatus;
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

export async function getShifts(): Promise<Shift[]> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<Shift[]> | Shift[]>(
    `/restaurants/${restaurantId}/shifts`
  );
  return unwrapResponse(data);
}

// Detail endpoint wrapper for future shift detail/edit screens.
export async function getShiftById(id: string): Promise<Shift> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<Shift> | Shift>(`/shifts/${id}`, {
    params: { restaurantId }
  });
  return unwrapResponse(data);
}

export async function createShift(payload: ShiftFormPayload): Promise<Shift> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.post<ApiResponse<Shift> | Shift>(
    `/restaurants/${restaurantId}/shifts`,
    payload
  );
  return unwrapResponse(data);
}

export async function updateShift(id: string, payload: ShiftFormPayload): Promise<Shift> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.put<ApiResponse<Shift> | Shift>(
    `/shifts/${id}`,
    payload,
    {
      params: { restaurantId }
    }
  );
  return unwrapResponse(data);
}

export async function deleteShift(id: string): Promise<void> {
  const restaurantId = requireRestaurantId();
  await apiClient.delete(`/shifts/${id}`, {
    params: { restaurantId }
  });
}
