import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig, isAxiosError } from "axios";

import { getLastRefreshError, refreshAuthTokens } from "@/api/token-refresh";
import type { ApiResponse, AppError, UserRole } from "@/api/types";
import { API_URL } from "@/lib/constants";
import { showWarning } from "@/lib/toast";
import { clearAuthSession, getAccessToken } from "@/stores/auth-session";
import { getRestaurantId } from "@/stores/restaurant-session";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry401?: boolean;
    _retry429?: boolean;
  }
}

const REFRESH_ENDPOINT = "/auth/refresh";
const LOGIN_ENDPOINT = "/auth/login";
const REGISTER_ENDPOINT = "/auth/register";

function parseRetryAfterSeconds(headers?: AxiosResponse["headers"]): number | undefined {
  if (!headers) {
    return undefined;
  }

  const retryAfterValue = headers["retry-after"];
  if (!retryAfterValue) {
    return undefined;
  }

  const rawValue = Array.isArray(retryAfterValue) ? retryAfterValue[0] : retryAfterValue;
  const seconds = Number(rawValue);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.floor(seconds));
  }

  const futureTime = new Date(rawValue).getTime();
  if (Number.isNaN(futureTime)) {
    return undefined;
  }

  const delta = Math.ceil((futureTime - Date.now()) / 1000);
  return delta > 0 ? delta : 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function toAppError(error: unknown, overrideMessage?: string): AppError {
  if (!isAxiosError(error)) {
    return {
      status: 0,
      code: "UNKNOWN",
      message: overrideMessage ?? "Unexpected error occurred",
      timestamp: new Date().toISOString(),
      originalError: error
    };
  }

  const status = error.response?.status ?? 0;
  const responseData = error.response?.data as ApiResponse<unknown> | undefined;
  const apiError = responseData?.error;

  const fallbackMessage = status === 409
    ? "A conflict occurred. Please refresh and try again."
    : status === 429
      ? "Too many requests, please wait"
      : status === 402
        ? "Your subscription has expired. Please subscribe to continue."
        : status === 401
          ? "You are not authorized. Please sign in again"
          : "Something went wrong. Please try again";

  return {
    status,
    code: apiError?.code ?? String(status || "UNKNOWN"),
    message: overrideMessage ?? apiError?.message ?? responseData?.message ?? fallbackMessage,
    field: apiError?.field,
    retryAfterSeconds: parseRetryAfterSeconds(error.response?.headers),
    timestamp: responseData?.timestamp ?? new Date().toISOString(),
    originalError: error
  };
}

async function refreshAccessTokenSilently() {
  const tokens = await refreshAuthTokens();
  return tokens?.accessToken ?? null;
}

function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const rawPayload = token.split(".")[1] ?? "";
    const normalized = rawPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveCurrentRestaurantRole(): UserRole | null {
  const accessToken = getAccessToken();
  const restaurantId = getRestaurantId();
  if (!accessToken || !restaurantId) {
    return null;
  }

  const payload = parseJwtPayload(accessToken);
  const restaurants = payload?.restaurants;
  if (!Array.isArray(restaurants)) {
    return null;
  }

  for (const entry of restaurants) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const id = record.restaurantId ?? record.id;
    const normalizedId = typeof id === "string" ? id : typeof id === "number" ? String(id) : "";
    if (normalizedId !== restaurantId) {
      continue;
    }
    const role = record.role;
    if (role === "OWNER" || role === "MANAGER" || role === "STAFF") {
      return role;
    }
  }

  return null;
}

function handleBillingBlocked() {
  const role = resolveCurrentRestaurantRole();
  if (role === "OWNER") {
    if (window.location.pathname !== "/settings/billing") {
      window.location.assign("/settings/billing");
    }
    return "Your subscription has expired. Please subscribe to continue.";
  }

  showWarning("Billing is blocked for this restaurant. Contact the account owner to restore access.");
  const onDashboard = window.location.pathname === "/dashboard";
  const hasBillingQuery = window.location.search.includes("billing=blocked");
  if (!onDashboard || !hasBillingQuery) {
    window.location.assign("/dashboard?billing=blocked");
  }
  return "Billing is blocked for this restaurant. Contact the account owner to restore access.";
}

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json"
  }
});

function shouldSendRestaurantHeader(url?: string) {
  if (!url) {
    return false;
  }

  return !(
    /\/restaurants\/[^/]+\/select(?:\?.*)?$/i.test(url) ||
    /\/auth\/(?:login|register|refresh|logout|forgot-password|reset-password|current-user|change-password)(?:\?.*)?$/i.test(url)
  );
}

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  const restaurantId = getRestaurantId();

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    config.headers.delete("Authorization");
  }

  if (restaurantId && shouldSendRestaurantHeader(config.url)) {
    config.headers.set("X-Restaurant-Id", restaurantId);
  } else {
    config.headers.delete("X-Restaurant-Id");
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;
    const status = error.response?.status;
    const responseData = error.response?.data as ApiResponse<unknown> | undefined;

    if (status === 401 && originalRequest && !originalRequest._retry401) {
      const url = originalRequest.url ?? "";
      const shouldSkipRefresh =
        url.includes(REFRESH_ENDPOINT) ||
        url.includes(LOGIN_ENDPOINT) ||
        url.includes(REGISTER_ENDPOINT);

      if (!shouldSkipRefresh) {
        originalRequest._retry401 = true;
        const nextAccessToken = await refreshAccessTokenSilently();

        if (nextAccessToken) {
          originalRequest.headers.set("Authorization", `Bearer ${nextAccessToken}`);
          return apiClient(originalRequest);
        }
      }

      // Refresh calls must not hard-redirect: a concurrent winner may already
      // hold a valid session, and register/login never need this path.
      if (!shouldSkipRefresh) {
        clearAuthSession();
        redirectToLogin();
      }
      const lastRefreshError = getLastRefreshError();
      const message = lastRefreshError?.status === 0
        ? "Could not refresh your session because the server is unreachable. Please sign in again."
        : "Session expired. Please sign in again";
      return Promise.reject(toAppError(error, message));
    }

    if (status === 429 && originalRequest) {
      const retryAfter = parseRetryAfterSeconds(error.response?.headers);
      showWarning("Too many requests. Please wait a moment.");

      if (!originalRequest._retry429 && typeof retryAfter === "number" && retryAfter > 0) {
        originalRequest._retry429 = true;
        await sleep(retryAfter * 1000);
        return apiClient(originalRequest);
      }

      return Promise.reject(toAppError(error, "Too many requests, please wait"));
    }

    if (status === 402) {
      const billingMessage = handleBillingBlocked();
      return Promise.reject(toAppError(error, billingMessage));
    }

    if (status === 409) {
      return Promise.reject(toAppError(error));
    }

    return Promise.reject(toAppError(error));
  }
);

export { toAppError };
