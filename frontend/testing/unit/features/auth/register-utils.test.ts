import { describe, expect, it } from "vitest";

import { getSignupErrorMessage, sanitizeSlug } from "@/features/auth/register-utils";

describe("register-utils", () => {
  it("sanitizes slug to lowercase hyphenated format", () => {
    expect(sanitizeSlug(" Northside Bistro!! 2026 ")).toBe("northside-bistro-2026");
  });

  it("maps slug conflict errors to user-facing message", () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            field: "restaurantSlug"
          }
        }
      }
    };

    expect(getSignupErrorMessage(error)).toBe("This booking URL slug is already taken. Please choose another.");
  });

  it("maps unreachable server errors to a connection message", () => {
    expect(getSignupErrorMessage({ status: 0, message: "Network Error" })).toBe(
      "Could not reach the server. Check your connection (and that the staging certificate is trusted), then try again."
    );
  });
});

