import { apiClient } from "@/api/client";
import type { ApiResponse, AppError, AuthTokens, CurrentUser } from "@/api/types";
import { clearAuthSession, setAuthSession } from "@/stores/auth-session";

interface TokenPayload {
  refreshToken: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  ownerName?: string;
  ownerPhone?: string;
}

interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

interface UpdateCurrentUserPayload {
  email: string;
  fullName?: string;
  phone?: string;
}

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
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

export async function login(email: string, password: string) {
  const payload: LoginPayload = { email, password };
  const { data } = await apiClient.post<ApiResponse<AuthTokens>>("/auth/login", payload);
  const tokens = unwrapResponse(data);
  setAuthSession(tokens.accessToken, tokens.refreshToken);
  return tokens;
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post<ApiResponse<AuthTokens>>("/auth/register", payload);
  const tokens = unwrapResponse(data);
  setAuthSession(tokens.accessToken, tokens.refreshToken);
  return tokens;
}

export async function refresh(refreshToken: string) {
  const payload: TokenPayload = { refreshToken };
  const { data } = await apiClient.post<ApiResponse<AuthTokens>>("/auth/refresh", payload);
  const tokens = unwrapResponse(data);
  setAuthSession(tokens.accessToken, tokens.refreshToken);
  return tokens;
}

export async function logout(refreshToken: string) {
  const payload: TokenPayload = { refreshToken };
  await apiClient.post<ApiResponse<null>>("/auth/logout", payload);
  clearAuthSession();
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<ApiResponse<CurrentUser>>("/auth/current-user");
  return unwrapResponse(data);
}

export async function forgotPassword(email: string) {
  await apiClient.post<ApiResponse<null>>("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string) {
  const payload: ResetPasswordPayload = { token, newPassword };
  await apiClient.post<ApiResponse<null>>("/auth/reset-password", payload);
}

export async function updateCurrentUser(payload: UpdateCurrentUserPayload) {
  const { data } = await apiClient.put<ApiResponse<CurrentUser>>("/auth/current-user", payload);
  return unwrapResponse(data);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const payload: ChangePasswordPayload = { currentPassword, newPassword };
  await apiClient.post<ApiResponse<null>>("/auth/change-password", payload);
}

export async function deleteCurrentUser() {
  await apiClient.delete<ApiResponse<null>>("/auth/current-user");
}
