import { createContext, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { login as loginRequest, logout as logoutRequest, refresh as refreshRequest, register as registerRequest, type RegisterPayload } from "@/api/auth";
import type { AuthTokens, UserRestaurant } from "@/api/types";
import { clearAuthSession, getRefreshToken, setAuthSession } from "@/stores/auth-session";

const REFRESH_TOKEN_STORAGE_KEY = "mesaro.refreshToken";
const REFRESH_LEEWAY_MS = 2 * 60 * 1000;

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  restaurants: UserRestaurant[];
  maxRestaurants: number;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  silentRefresh: () => Promise<boolean>;
  setAuthTokens: (tokens: AuthTokens) => void;
  setScopedAccessToken: (accessToken: string, expiresIn: number) => void;
}

interface JwtPayload {
  sub?: string;
  email?: string;
  userId?: string | number;
  uid?: string | number;
  restaurants?: unknown;
  roles?: unknown;
  maxRestaurants?: number;
  exp?: number;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

function safeBase64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    const decoded = safeBase64UrlDecode(parts[1]);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

function normalizeRestaurants(rawRestaurants: unknown): UserRestaurant[] {
  if (typeof rawRestaurants === "string") {
    try {
      return normalizeRestaurants(JSON.parse(rawRestaurants));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(rawRestaurants)) {
    return [];
  }

  return rawRestaurants
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const restaurantId = record.restaurantId ?? record.restaurant_id ?? record.id;
      const role = record.role;
      const normalizedRestaurantId =
        typeof restaurantId === "string"
          ? restaurantId
          : typeof restaurantId === "number" && Number.isFinite(restaurantId)
            ? String(restaurantId)
            : null;

      if (!normalizedRestaurantId || typeof role !== "string") {
        return null;
      }

      return {
        restaurantId: normalizedRestaurantId,
        role: role as UserRestaurant["role"]
      };
    })
    .filter((item): item is UserRestaurant => item !== null);
}

function deriveAuthStateFromToken(accessToken: string) {
  const payload = parseJwtPayload(accessToken);
  const rawUserId = payload?.userId ?? payload?.uid ?? payload?.sub ?? "";
  const normalizedUserId =
    typeof rawUserId === "string" ? rawUserId : typeof rawUserId === "number" ? String(rawUserId) : "";
  const user: AuthUser | null = payload
    ? {
        id: normalizedUserId,
        email: payload.email ?? ""
      }
    : null;

  const restaurants = normalizeRestaurants(payload?.restaurants);
  const maxRestaurants = typeof payload?.maxRestaurants === "number" ? payload.maxRestaurants : 1;
  const expiresAt = payload?.exp ? payload.exp * 1000 : null;

  return {
    user: user && user.id ? user : null,
    restaurants,
    maxRestaurants,
    expiresAt
  };
}

function persistRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restaurants, setRestaurants] = useState<UserRestaurant[]>([]);
  const [maxRestaurants, setMaxRestaurants] = useState<number>(1);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(getRefreshToken());
  const [accessTokenExpiresAt, setAccessTokenExpiresAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTimeoutRef = useRef<number | null>(null);
  const bootstrapStartedRef = useRef(false);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const applyTokens = useCallback((tokens: AuthTokens) => {
    const { user: nextUser, restaurants: nextRestaurants, maxRestaurants: nextMaxRestaurants, expiresAt } = deriveAuthStateFromToken(tokens.accessToken);

    setUser(nextUser);
    setRestaurants(nextRestaurants);
    setMaxRestaurants(nextMaxRestaurants);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);

    const derivedExpiry = expiresAt ?? Date.now() + tokens.expiresIn * 1000;
    setAccessTokenExpiresAt(derivedExpiry);

    setAuthSession(tokens.accessToken, tokens.refreshToken);
    persistRefreshToken(tokens.refreshToken);

    return nextRestaurants;
  }, []);

  const setScopedAccessToken = useCallback(
    (nextAccessToken: string, expiresIn: number) => {
      const { user: nextUser, restaurants: nextRestaurants, maxRestaurants: nextMaxRestaurants, expiresAt } = deriveAuthStateFromToken(nextAccessToken);

      if (nextUser) {
        setUser(nextUser);
      }
      if (nextRestaurants.length > 0) {
        setRestaurants(nextRestaurants);
        setMaxRestaurants(nextMaxRestaurants);
      }

      setAccessToken(nextAccessToken);
      setAccessTokenExpiresAt(expiresAt ?? Date.now() + expiresIn * 1000);
      setAuthSession(nextAccessToken);
    },
    []
  );

  const clearState = useCallback(() => {
    clearRefreshTimer();
    setUser(null);
    setRestaurants([]);
    setMaxRestaurants(1);
    setAccessToken(null);
    setRefreshToken(null);
    setAccessTokenExpiresAt(null);
    clearAuthSession();
    persistRefreshToken(null);
  }, [clearRefreshTimer]);

  const silentRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const activeRefreshToken = refreshToken ?? getStoredRefreshToken();
    if (!activeRefreshToken) {
      clearState();
      return false;
    }

    const refreshAttempt = (async () => {
      try {
        const tokens = await refreshRequest(activeRefreshToken);
        applyTokens(tokens);
        return true;
      } catch {
        clearState();
        return false;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = refreshAttempt;
    return refreshAttempt;
  }, [applyTokens, clearState, refreshToken]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await loginRequest(email, password);
    applyTokens(tokens);
  }, [applyTokens]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const tokens = await registerRequest(payload);
    applyTokens(tokens);
  }, [applyTokens]);

  const logout = useCallback(async () => {
    const activeRefreshToken = refreshToken ?? getStoredRefreshToken();

    try {
      if (activeRefreshToken) {
        await logoutRequest(activeRefreshToken);
      }
    } finally {
      clearState();
      window.location.assign("/login");
    }
  }, [clearState, refreshToken]);

  useEffect(() => {
    if (bootstrapStartedRef.current) {
      return;
    }
    bootstrapStartedRef.current = true;

    const bootstrap = async () => {
      const storedRefreshToken = getStoredRefreshToken();
      if (!storedRefreshToken) {
        setIsLoading(false);
        return;
      }

      setRefreshToken(storedRefreshToken);

      try {
        const tokens = await refreshRequest(storedRefreshToken);
        applyTokens(tokens);
      } catch {
        clearState();
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, [applyTokens, clearState]);

  useEffect(() => {
    clearRefreshTimer();

    if (!isAuthenticated(accessToken, accessTokenExpiresAt)) {
      return;
    }

    const delay = Math.max((accessTokenExpiresAt ?? Date.now()) - Date.now() - REFRESH_LEEWAY_MS, 0);
    refreshTimeoutRef.current = window.setTimeout(() => {
      void silentRefresh();
    }, delay);

    return clearRefreshTimer;
  }, [accessToken, accessTokenExpiresAt, clearRefreshTimer, silentRefresh]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== REFRESH_TOKEN_STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        clearState();
        return;
      }

      setRefreshToken(event.newValue);
      if (!accessToken) {
        void silentRefresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [accessToken, clearState, silentRefresh]);

  const value = useMemo(
    () => ({
      user,
      restaurants,
      maxRestaurants,
      accessToken,
      refreshToken,
      isAuthenticated: isAuthenticated(accessToken, accessTokenExpiresAt),
      isLoading,
      login,
      register,
      logout,
      silentRefresh,
      setAuthTokens: applyTokens,
      setScopedAccessToken
    }),
    [
      user,
      restaurants,
      maxRestaurants,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      isLoading,
      login,
      register,
      logout,
      silentRefresh,
      setScopedAccessToken
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isAuthenticated(accessToken: string | null, accessTokenExpiresAt: number | null) {
  if (!accessToken) {
    return false;
  }

  if (!accessTokenExpiresAt) {
    return true;
  }

  return accessTokenExpiresAt > Date.now();
}
