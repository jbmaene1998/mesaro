import { apiClient } from "@/api/client";
import type {
  ApiResponse,
  AppError,
  AssignStaffRecurringWeekResult,
  StaffPlanningAssignment,
  StaffPlanningDay,
  StaffWeeklyWorkHours
} from "@/api/types";
import { getRestaurantId } from "@/stores/restaurant-session";

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

export async function getStaffPlanning(serviceDate: string): Promise<StaffPlanningDay> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<StaffPlanningDay> | StaffPlanningDay>(
    `/restaurants/${restaurantId}/staff-planning`,
    { params: { date: serviceDate } }
  );
  return unwrapResponse(data);
}

export async function assignStaffToShift(payload: {
  shiftId: string;
  userId: string;
  serviceDate: string;
  startTime?: string;
  endTime?: string;
}): Promise<StaffPlanningAssignment> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.post<ApiResponse<StaffPlanningAssignment> | StaffPlanningAssignment>(
    `/restaurants/${restaurantId}/staff-planning/assignments`,
    payload
  );
  return unwrapResponse(data);
}

export async function assignStaffToShiftForWeek(payload: {
  shiftId: string;
  userId: string;
  serviceDate: string;
  startTime?: string;
  endTime?: string;
}): Promise<AssignStaffRecurringWeekResult> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.post<ApiResponse<AssignStaffRecurringWeekResult> | AssignStaffRecurringWeekResult>(
    `/restaurants/${restaurantId}/staff-planning/assignments/recurring-week`,
    payload
  );
  return unwrapResponse(data);
}

export async function removeStaffAssignment(assignmentId: string): Promise<void> {
  requireRestaurantId();
  await apiClient.delete(`/staff-planning/assignments/${assignmentId}`);
}

export async function getWeeklyWorkHours(weekStartDate: string): Promise<StaffWeeklyWorkHours[]> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<StaffWeeklyWorkHours[]> | StaffWeeklyWorkHours[]>(
    `/restaurants/${restaurantId}/staff-planning/work-hours`,
    { params: { weekStartDate } }
  );
  return unwrapResponse(data);
}

export async function setWeeklyWorkHours(payload: {
  userId: string;
  weekStartDate: string;
  plannedHours: number;
}): Promise<StaffWeeklyWorkHours> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.post<ApiResponse<StaffWeeklyWorkHours> | StaffWeeklyWorkHours>(
    `/restaurants/${restaurantId}/staff-planning/work-hours`,
    payload
  );
  return unwrapResponse(data);
}
