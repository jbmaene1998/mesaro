import axios from "axios";

import type { ApiResponse, AppError, AuthTokens } from "@/api/types";
import { API_URL } from "@/lib/constants";
import { clearAuthSession, getRefreshToken, setAuthSession } from "@/stores/auth-session";

const REFRESH_ENDPOINT = "/auth/refresh";
const REFRESH_TOKEN_STORAGE_KEY = "mesaro.refreshToken";

const refreshClient = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json"
  }
});

let refreshPromise: Promise<AuthTokens | null> | null = null;
let lastRefreshError: AppError | null = null;

function persistRefreshToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

function readStoredRefreshToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

function toRefreshError(error: unknown): AppError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const responseData = error.response?.data as ApiResponse<unknown> | undefined;
    return {
      status,
      code: responseData?.error?.code ?? String(status || "UNKNOWN"),
      message: responseData?.error?.message ?? responseData?.message ?? "Could not refresh session",
      timestamp: responseData?.timestamp ?? new Date().toISOString(),
      originalError: error
    };
  }

  return {
    status: 0,
    code: "UNKNOWN",
    message: "Could not refresh session",
    timestamp: new Date().toISOString(),
    originalError: error
  };
}

/**
 * Rotate the refresh token exactly once across the whole SPA.
 * Concurrent callers share the same in-flight promise so a second refresh
 * cannot burn the just-rotated token and force a login redirect.
 */
export async function refreshAuthTokens(explicitRefreshToken?: string | null): Promise<AuthTokens | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  // Always prefer the newest session token. An explicit argument may be a
  // stale closure value from before a concurrent rotation.
  const refreshToken =
    getRefreshToken() ?? readStoredRefreshToken() ?? explicitRefreshToken ?? null;

  if (!refreshToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const { data } = await refreshClient.post<ApiResponse<AuthTokens>>(REFRESH_ENDPOINT, {
        refreshToken
      });

      if (!data.success || !data.data?.accessToken || !data.data.refreshToken) {
        lastRefreshError = {
          status: 401,
          code: "UNAUTHORIZED",
          message: "Refresh token rejected",
          timestamp: new Date().toISOString()
        };
        return null;
      }

      setAuthSession(data.data.accessToken, data.data.refreshToken);
      persistRefreshToken(data.data.refreshToken);
      lastRefreshError = null;
      return data.data;
    } catch (error) {
      lastRefreshError = toRefreshError(error);
      // Only wipe memory if we still hold the token that failed. A concurrent
      // winner may already have rotated to a newer session.
      if (getRefreshToken() === refreshToken || !getRefreshToken()) {
        clearAuthSession();
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function getLastRefreshError() {
  return lastRefreshError;
}

export function clearPersistedRefreshToken() {
  persistRefreshToken(null);
}
