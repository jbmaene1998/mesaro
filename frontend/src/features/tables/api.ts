import { format } from "date-fns";

import { apiClient } from "@/api/client";
import type {
  ApiResponse,
  AppError,
  DiningTable,
  TableCombination,
  TableStatus as TableConfigStatus
} from "@/api/types";
import { getRestaurantId } from "@/stores/restaurant-session";

export interface TableStatus {
  tableId: string;
  label: string;
  // Current backend returns config status; keep string for forward compatibility.
  status: string;
  available?: boolean;
  reservation?: {
    guestName: string;
    endTime: string;
  };
}

export interface ReassignmentInfo {
  confirmationCode: string;
  guestName: string;
  startAtUtc: string;
  oldTableLabel: string;
  newTableLabel: string;
}

export interface UnresolvableReservation {
  confirmationCode: string;
  guestName: string;
  startAtUtc: string;
  partySize: number;
}

export interface TableUpdateResult {
  table: DiningTable;
  reassigned: ReassignmentInfo[];
  needsAttention: UnresolvableReservation[];
}

interface RawTableStatus {
  tableId?: string | number;
  id?: string | number;
  label?: string;
  status?: string;
  available?: boolean;
  reservation?: {
    guestName?: string;
    endTime?: string;
  };
}

export interface TableFormPayload {
  label: string;
  seats: number;
  status: TableConfigStatus;
}

export interface CombinationFormPayload {
  name: string;
  tableIds: string[];
  minCapacity: number;
  maxCapacity: number;
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

export async function getTables(): Promise<DiningTable[]> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<DiningTable[]> | DiningTable[]>(
    `/restaurants/${restaurantId}/tables`
  );
  return unwrapResponse(data);
}

// Used by TableManagementPage to hydrate the latest row before editing.
export async function getTableById(id: string): Promise<DiningTable> {
  const { data } = await apiClient.get<ApiResponse<DiningTable> | DiningTable>(`/tables/${id}`);
  return unwrapResponse(data);
}

export async function getTableStatus(params?: {
  date?: string;
  startTime?: string;
  endTime?: string;
}): Promise<TableStatus[]> {
  const restaurantId = requireRestaurantId();
  const effectiveDate = params?.date ?? format(new Date(), "yyyy-MM-dd");
  const effectiveStartTime = params?.startTime ?? format(new Date(), "HH:mm:ss");

  const { data } = await apiClient.get<ApiResponse<RawTableStatus[]> | RawTableStatus[]>(
    `/restaurants/${restaurantId}/tables/status`,
    {
      params: {
        date: effectiveDate,
        startTime: effectiveStartTime,
        endTime: params?.endTime
      }
    }
  );
  const payload = unwrapResponse(data);
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => ({
    tableId: String(item.tableId ?? item.id ?? ""),
    label: String(item.label ?? ""),
    status: typeof item.available === "boolean"
      ? (item.available ? "AVAILABLE" : "UNAVAILABLE")
      : String(item.status ?? "UNAVAILABLE"),
    available: typeof item.available === "boolean" ? item.available : undefined,
    reservation: item.reservation
      ? {
          guestName: String(item.reservation.guestName ?? ""),
          endTime: String(item.reservation.endTime ?? "")
        }
      : undefined
  }));
}

export async function createTable(payload: TableFormPayload): Promise<DiningTable> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.post<ApiResponse<DiningTable> | DiningTable>(
    `/restaurants/${restaurantId}/tables`,
    payload
  );
  return unwrapResponse(data);
}

export async function updateTable(id: string, payload: TableFormPayload): Promise<TableUpdateResult> {
  const { data } = await apiClient.put<ApiResponse<TableUpdateResult> | TableUpdateResult>(
    `/tables/${id}`,
    payload
  );
  return unwrapResponse(data);
}

export async function deleteTable(id: string): Promise<void> {
  await apiClient.delete(`/tables/${id}`);
}

export async function getCombinations(): Promise<TableCombination[]> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<TableCombination[]> | TableCombination[]>(
    `/restaurants/${restaurantId}/combinations`
  );
  return unwrapResponse(data);
}

export async function createCombination(payload: CombinationFormPayload): Promise<TableCombination> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.post<ApiResponse<TableCombination> | TableCombination>(
    `/restaurants/${restaurantId}/combinations`,
    payload
  );
  return unwrapResponse(data);
}

export async function updateCombination(id: string, payload: CombinationFormPayload): Promise<TableCombination> {
  const { data } = await apiClient.put<ApiResponse<TableCombination> | TableCombination>(
    `/combinations/${id}`,
    payload
  );
  return unwrapResponse(data);
}

export async function deleteCombination(id: string): Promise<void> {
  await apiClient.delete(`/combinations/${id}`);
}
