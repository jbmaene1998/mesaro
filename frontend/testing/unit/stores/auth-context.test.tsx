import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useContext, useEffect, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthTokens } from "@/api/types";
import { I18nProvider } from "@/i18n";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AuthProvider, AuthContext } from "@/stores/auth-context";
import { getAccessToken } from "@/stores/auth-session";

const loginMock = vi.fn();
const logoutMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@/api/auth", () => ({
  login: (...args: unknown[]) => loginMock(...args),
  logout: (...args: unknown[]) => logoutMock(...args),
  refresh: (...args: unknown[]) => refreshMock(...args)
}));

function encodeBase64Url(input: object) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

function createJwt(payload: Record<string, unknown>) {
  const header = encodeBase64Url({ alg: "HS256", typ: "JWT" });
  const body = encodeBase64Url(payload);
  return `${header}.${body}.signature`;
}

function TokenSetter({ tokens }: { tokens: AuthTokens }) {
  const auth = useContext(AuthContext);
  const applied = useRef(false);

  useEffect(() => {
    if (!auth || applied.current) {
      return;
    }
    applied.current = true;
    auth.setAuthTokens(tokens);
  }, [auth, tokens]);

  return null;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    loginMock.mockReset();
    logoutMock.mockReset();
    refreshMock.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects to login when not authenticated", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/secure"]}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/secure"
                element={
                  <ProtectedRoute>
                    <div>Secure Page</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Secure Page")).not.toBeInTheDocument();
  });

  it("stores access token in memory (not localStorage)", async () => {
    const tokens: AuthTokens = {
      accessToken: createJwt({
        sub: "user-1",
        email: "owner@example.com",
        restaurants: [{ restaurantId: "r-1", role: "OWNER" }],
        exp: Math.floor(Date.now() / 1000) + 3600
      }),
      refreshToken: "refresh-1",
      expiresIn: 3600
    };

    refreshMock.mockResolvedValue(tokens);

    render(
      <MemoryRouter>
        <AuthProvider>
          <TokenSetter tokens={tokens} />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAccessToken()).toBe(tokens.accessToken);
    });

    expect(localStorage.getItem("mesaro.refreshToken")).toBe("refresh-1");
    expect(localStorage.getItem("mesaro.accessToken")).toBeNull();
  });

  it("refreshes token before expiry", async () => {
    const initialTokens: AuthTokens = {
      accessToken: createJwt({
        sub: "user-1",
        email: "manager@example.com",
        restaurants: [{ restaurantId: "r-1", role: "MANAGER" }],
        exp: Math.floor(Date.now() / 1000) + 121
      }),
      refreshToken: "refresh-before-expiry",
      expiresIn: 121
    };

    refreshMock.mockResolvedValue({
      accessToken: createJwt({
        sub: "user-1",
        email: "manager@example.com",
        restaurants: [{ restaurantId: "r-1", role: "MANAGER" }],
        exp: Math.floor(Date.now() / 1000) + 7200
      }),
      refreshToken: "refresh-after",
      expiresIn: 7200
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <TokenSetter tokens={initialTokens} />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledWith("refresh-before-expiry");
    }, { timeout: 3000 });
  });

});
