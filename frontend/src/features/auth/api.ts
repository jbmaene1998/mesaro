import { forgotPassword as forgotPasswordRequest, register as registerRequest, resetPassword as resetPasswordRequest } from "@/api/auth";
import { apiClient } from "@/api/client";
import type { ApiResponse, AppError } from "@/api/types";

export async function forgotPassword(email: string) {
  await forgotPasswordRequest(email);
}

export interface RegisterAccountPayload {
  email: string;
  password: string;
  ownerName?: string;
  ownerPhone?: string;
}

export async function registerAccount(payload: RegisterAccountPayload) {
  return registerRequest(payload);
}

export async function resetPassword(token: string, newPassword: string) {
  await resetPasswordRequest(token, newPassword);
}

export interface StaffInvitePreview {
  restaurantName: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  email: string;
  passwordRequired: boolean;
  expired: boolean;
  alreadyAccepted: boolean;
}

export async function previewInvite(inviteToken: string) {
  const { data } = await apiClient.get<ApiResponse<StaffInvitePreview>>("/staff/invites/preview", {
    params: { token: inviteToken }
  });
  return unwrapResponse(data);
}

export interface AcceptInviteResult {
  verificationRequired: boolean;
  email: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
}

export async function acceptInvite(inviteToken: string, password?: string) {
  const payload: { inviteToken: string; password?: string } = { inviteToken };
  if (password && password.trim().length > 0) {
    payload.password = password;
  }
  const { data } = await apiClient.post<ApiResponse<AcceptInviteResult>>("/staff/accept-invite", payload);
  return unwrapResponse(data);
}

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
