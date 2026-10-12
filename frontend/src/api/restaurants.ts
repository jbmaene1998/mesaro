import { apiClient } from "@/api/client";
import type {
  ApiResponse,
  AppContextResponse,
  AppError,
  RestaurantSummary,
  SelectedRestaurantResponse
} from "@/api/types";

function unwrapResponse<T>(response: ApiResponse<T>) {
  if (response.success && response.data !== null) {
    return response.data;
  }

  const appError: AppError = {
    status: 400,
    code: response.error?.code ?? "UNKNOWN",
    message: response.error?.message ?? response.message ?? "Request failed",
    field: response.error?.field,
    timestamp: response.timestamp
  };

  throw appError;
}

function normalizeId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

export async function getRestaurants() {
  const { data } = await apiClient.get<ApiResponse<RestaurantSummary[]>>("/restaurants");
  return unwrapResponse(data).map((restaurant) => ({
    ...restaurant,
    id: normalizeId((restaurant as { id?: unknown }).id)
  }));
}

export async function selectRestaurant(restaurantId: string) {
  const { data } = await apiClient.post<ApiResponse<SelectedRestaurantResponse>>(
    `/restaurants/${restaurantId}/select`
  );
  const selected = unwrapResponse(data) as SelectedRestaurantResponse & { restaurantId?: unknown };
  return {
    ...selected,
    restaurantId: normalizeId(selected.restaurantId)
  };
}

export async function getAppContext() {
  const { data } = await apiClient.get<ApiResponse<AppContextResponse>>("/context");
  const context = unwrapResponse(data) as AppContextResponse & { restaurantId?: unknown };
  const restaurantId = normalizeId(context.restaurantId);
  return {
    ...context,
    restaurantId
  };
}

export interface CreateRestaurantPayload {
  name: string;
  slug: string;
  timezone: string;
  locale?: string;
  slotIntervalMinutes?: number;
  defaultDurationMinutes?: number;
  minNoticeMinutes?: number;
  maxAdvanceDays?: number;
  maxPartySize?: number;
  assignmentMode?: "AUTO" | "MANUAL";
}

export async function createRestaurant(payload: CreateRestaurantPayload) {
  const { data } = await apiClient.post<ApiResponse<RestaurantSummary>>("/restaurants", payload);
  const restaurant = unwrapResponse(data) as RestaurantSummary & { id?: unknown };
  return {
    ...restaurant,
    id: normalizeId(restaurant.id)
  };
}
