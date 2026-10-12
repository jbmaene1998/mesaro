import { apiClient } from "@/api/client";
import type { ApiResponse, AppError, ClosureReason, Vacation, VacationReason } from "@/api/types";
import { getRestaurantId } from "@/stores/restaurant-session";

interface VacationFormBase {
  startDate: string;
  endDate: string;
  notes: string;
}

export interface RestaurantClosureFormPayload extends VacationFormBase {
  type: "RESTAURANT_CLOSURE";
  reason: ClosureReason;
}

export interface StaffVacationFormPayload extends VacationFormBase {
  type: "STAFF_VACATION";
  reason: VacationReason;
}

export type VacationFormPayload = RestaurantClosureFormPayload | StaffVacationFormPayload;

interface VacationRequestBodyBase {
  type: "RESTAURANT_CLOSURE" | "STAFF_VACATION";
  startDate: string;
  endDate: string;
  notes: string;
}

interface RestaurantClosureRequestBody extends VacationRequestBodyBase {
  type: "RESTAURANT_CLOSURE";
  closureReason: ClosureReason;
}

interface StaffVacationRequestBody extends VacationRequestBodyBase {
  type: "STAFF_VACATION";
  vacationReason: VacationReason;
}

type VacationRequestBody = RestaurantClosureRequestBody | StaffVacationRequestBody;

function buildVacationRequestBody(payload: VacationFormPayload): VacationRequestBody {
  const base: VacationRequestBodyBase = {
    type: payload.type,
    startDate: payload.startDate,
    endDate: payload.endDate,
    notes: payload.notes
  };

  if (payload.type === "RESTAURANT_CLOSURE") {
    return {
      ...base,
      type: "RESTAURANT_CLOSURE",
      closureReason: payload.reason
    };
  }

  return {
    ...base,
    type: "STAFF_VACATION",
    vacationReason: payload.reason
  };
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

export async function getVacations(): Promise<Vacation[]> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<Vacation[]> | Vacation[]>(
    `/restaurants/${restaurantId}/vacations`
  );
  return unwrapResponse(data);
}

// Detail endpoint wrapper for future vacation detail/review screens.
export async function getVacationById(id: string): Promise<Vacation> {
  const { data } = await apiClient.get<ApiResponse<Vacation> | Vacation>(`/vacations/${id}`);
  return unwrapResponse(data);
}

export async function createVacation(payload: VacationFormPayload): Promise<Vacation> {
  const restaurantId = requireRestaurantId();
  const requestBody = buildVacationRequestBody(payload);
  const { data } = await apiClient.post<ApiResponse<Vacation> | Vacation>(
    `/restaurants/${restaurantId}/vacations`,
    requestBody
  );
  return unwrapResponse(data);
}

export async function updateVacation(id: string, payload: VacationFormPayload): Promise<Vacation> {
  const requestBody = buildVacationRequestBody(payload);
  const { data } = await apiClient.put<ApiResponse<Vacation> | Vacation>(
    `/vacations/${id}`,
    requestBody
  );
  return unwrapResponse(data);
}

export async function deleteVacation(id: string): Promise<void> {
  await apiClient.delete(`/vacations/${id}`);
}

export async function approveVacation(id: string): Promise<Vacation> {
  const { data } = await apiClient.post<ApiResponse<Vacation> | Vacation>(`/vacations/${id}/approve`);
  return unwrapResponse(data);
}

export async function rejectVacation(id: string, reason?: string): Promise<Vacation> {
  const { data } = await apiClient.post<ApiResponse<Vacation> | Vacation>(
    `/vacations/${id}/reject`,
    { reason }
  );
  return unwrapResponse(data);
}
