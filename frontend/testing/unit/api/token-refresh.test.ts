import { beforeEach, describe, expect, it, vi } from "vitest";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn()
}));

vi.mock("axios", () => {
  const create = () => ({ post: postMock });
  return {
    default: {
      create,
      isAxiosError: (error: unknown) => Boolean(error && typeof error === "object" && "isAxiosError" in error)
    }
  };
});

import { refreshAuthTokens } from "@/api/token-refresh";
import { getAccessToken, getRefreshToken, setAuthSession } from "@/stores/auth-session";

describe("refreshAuthTokens", () => {
  beforeEach(() => {
    postMock.mockReset();
    setAuthSession(null, null);
    localStorage.clear();
  });

  it("single-flights concurrent refresh calls so the token rotates once", async () => {
    setAuthSession("access-1", "refresh-1");
    localStorage.setItem("mesaro.refreshToken", "refresh-1");

    let resolvePost: (value: unknown) => void = () => undefined;
    postMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );

    const first = refreshAuthTokens("refresh-1");
    const second = refreshAuthTokens("refresh-1");

    expect(postMock).toHaveBeenCalledTimes(1);

    resolvePost({
      data: {
        success: true,
        data: {
          accessToken: "access-2",
          refreshToken: "refresh-2",
          expiresIn: 900
        }
      }
    });

    await expect(first).resolves.toMatchObject({ accessToken: "access-2", refreshToken: "refresh-2" });
    await expect(second).resolves.toMatchObject({ accessToken: "access-2", refreshToken: "refresh-2" });
    expect(getAccessToken()).toBe("access-2");
    expect(getRefreshToken()).toBe("refresh-2");
    expect(localStorage.getItem("mesaro.refreshToken")).toBe("refresh-2");
  });

  it("prefers the newest stored token over a stale explicit argument", async () => {
    setAuthSession("access-2", "refresh-2");
    localStorage.setItem("mesaro.refreshToken", "refresh-2");
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: "access-3",
          refreshToken: "refresh-3",
          expiresIn: 900
        }
      }
    });

    await refreshAuthTokens("refresh-1");

    expect(postMock).toHaveBeenCalledWith("/auth/refresh", { refreshToken: "refresh-2" });
  });
});
