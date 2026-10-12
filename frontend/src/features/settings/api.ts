import { apiClient } from "@/api/client";
import type { ApiResponse, AppError, OpeningHoursDay, RestaurantSummary } from "@/api/types";
import { getRestaurantId } from "@/stores/restaurant-session";

export interface RestaurantUpdatePayload {
  name?: string;
  timezone?: string;
  locale?: string;
  bookingEnabled?: boolean;
  slotIntervalMinutes?: number;
  defaultDurationMinutes?: number;
  minNoticeMinutes?: number;
  maxAdvanceDays?: number;
  maxPartySize?: number;
  assignmentMode?: "AUTO" | "MANUAL";
}

export interface OpeningHoursUpdateDayPayload {
  dayOfWeek: number;
  open: boolean;
  openLocalTime: string | null;
  closeLocalTime: string | null;
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

export async function getRestaurantDetails(): Promise<RestaurantSummary> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<RestaurantSummary> | RestaurantSummary>(
    `/restaurants/${restaurantId}`
  );
  return unwrapResponse(data);
}

export async function updateRestaurant(payload: RestaurantUpdatePayload): Promise<RestaurantSummary> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.put<ApiResponse<RestaurantSummary> | RestaurantSummary>(
    `/restaurants/${restaurantId}`,
    payload
  );
  return unwrapResponse(data);
}

export async function getOpeningHours(): Promise<OpeningHoursDay[]> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<OpeningHoursDay[]> | OpeningHoursDay[]>(
    `/restaurants/${restaurantId}/opening-hours`
  );
  return unwrapResponse(data);
}

export async function updateOpeningHours(payload: OpeningHoursUpdateDayPayload[]): Promise<OpeningHoursDay[]> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.put<ApiResponse<OpeningHoursDay[]> | OpeningHoursDay[]>(
    `/restaurants/${restaurantId}/opening-hours`,
    payload
  );
  return unwrapResponse(data);
}
