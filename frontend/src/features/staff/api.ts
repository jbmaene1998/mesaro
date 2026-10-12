import { apiClient } from "@/api/client";
import type { ApiResponse, AppError, UserRole } from "@/api/types";

export interface StaffItem {
  id: string;
  userId?: string;
  name?: string;
  fullName?: string;
  email: string;
  role: UserRole;
  status: "ACTIVE" | "INVITED";
  invitedAt?: string;
  expiresAt?: string;
  lastLoginAt?: string;
  lastLogin?: string;
}

interface LegacyStaffListResponse {
  members: StaffItem[];
  pendingInvites: StaffItem[];
}

export interface StaffInvite {
  id: string;
  email: string;
  role: UserRole;
  invitedAt: string;
  expiresAt: string;
}

function normalizeStaffItem(item: StaffItem, fallbackStatus?: StaffItem["status"]): StaffItem {
  return {
    ...item,
    name: item.name ?? item.fullName,
    lastLoginAt: item.lastLoginAt ?? item.lastLogin,
    status: item.status ?? fallbackStatus ?? "ACTIVE"
  };
}

function normalizeStaffList(payload: StaffItem[] | LegacyStaffListResponse): StaffItem[] {
  if (Array.isArray(payload)) {
    // New contract: backend returns a unified array with explicit status.
    return payload.map((item) => normalizeStaffItem(item));
  }

  // Legacy fallback: merge split lists and inject the implied status.
  const members = (payload.members ?? []).map((item) => normalizeStaffItem(item, "ACTIVE"));
  const pendingInvites = (payload.pendingInvites ?? []).map((item) => normalizeStaffItem(item, "INVITED"));
  return [...members, ...pendingInvites];
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

export async function getStaff(): Promise<StaffItem[]> {
  const { data } = await apiClient.get<
    ApiResponse<StaffItem[] | LegacyStaffListResponse> | StaffItem[] | LegacyStaffListResponse
  >("/staff");
  const payload = unwrapResponse(data);
  return normalizeStaffList(payload);
}

export async function inviteStaff(email: string, firstName: string, lastName: string, role: UserRole): Promise<StaffInvite> {
  const { data } = await apiClient.post<ApiResponse<StaffInvite> | StaffInvite>("/staff/invite", {
    email,
    firstName,
    lastName,
    role
  });
  return unwrapResponse(data);
}

// Detail endpoint wrapper for future staff profile/review screens.
export async function getStaffMember(id: string): Promise<StaffItem> {
  const { data } = await apiClient.get<ApiResponse<StaffItem> | StaffItem>(`/staff/${id}`);
  return unwrapResponse(data);
}

export async function updateStaffRole(id: string, role: UserRole): Promise<StaffItem> {
  const { data } = await apiClient.put<ApiResponse<StaffItem> | StaffItem>(`/staff/${id}`, { role });
  return unwrapResponse(data);
}

export async function removeStaff(id: string): Promise<void> {
  await apiClient.delete(`/staff/${id}`);
}

export async function resendInvite(id: string): Promise<void> {
  await apiClient.post(`/staff/${id}/resend-invite`);
}
