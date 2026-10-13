import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatInTimeZone } from "date-fns-tz";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { Reservation, UserRole } from "@/api/types";
import { ReservationActions } from "@/features/reservations/components/ReservationActions";
import { I18nProvider } from "@/i18n";
import { AuthContext } from "@/stores/auth-context";
import { RestaurantContext } from "@/stores/restaurant-context";

function buildReservation(status: Reservation["status"], when: "today" | "tomorrow" = "today"): Reservation {
  const timezone = "UTC";
  const now = Date.now();
  const start = new Date(when === "tomorrow" ? now + 26 * 60 * 60 * 1000 : now + 30 * 60 * 1000);
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const date = formatInTimeZone(start, timezone, "yyyy-MM-dd");
  return {
    id: "res-1",
    confirmationCode: "ABC123",
    guestName: "Jane Doe",
    guestEmail: "jane@example.com",
    guestPhone: "+15550001111",
    partySize: 2,
    date,
    time: formatInTimeZone(start, timezone, "HH:mm"),
    timezone,
    startAtUtc: start.toISOString(),
    endAtUtc: end.toISOString(),
    status,
    shiftName: "Dinner",
    tableLabels: ["T1"],
    notes: null
  };
}

function renderActions(role: UserRole, reservation: Reservation) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const authValue = {
    user: { id: "user-1", email: `${role.toLowerCase()}@demo.com` },
    restaurants: [{ restaurantId: "r-1", role }],
    accessToken: "token",
    refreshToken: "refresh",
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    silentRefresh: vi.fn(),
    setAuthTokens: vi.fn(),
    setScopedAccessToken: vi.fn()
  };

  const restaurantValue = {
    currentRestaurant: { id: "r-1", slug: "demo", name: "Demo", role, timezone: "UTC" },
    availableRestaurants: [{ id: "r-1", slug: "demo", name: "Demo", role, timezone: "UTC" }],
    isLoading: false,
    selectRestaurant: vi.fn(),
    refreshContext: vi.fn()
  };

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue as any}>
        <RestaurantContext.Provider value={restaurantValue as any}>
          <I18nProvider>
            <MemoryRouter>
              <ReservationActions reservation={reservation} onViewDetails={vi.fn()} />
            </MemoryRouter>
          </I18nProvider>
        </RestaurantContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("ReservationActions", () => {
  it("shows Seat for CONFIRMED reservation on its service day", async () => {
    const user = userEvent.setup();
    renderActions("MANAGER", buildReservation("CONFIRMED", "today"));

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.getByText(/seat guest/i)).toBeInTheDocument();
  });

  it("hides Seat for CONFIRMED reservation on a future service day", async () => {
    const user = userEvent.setup();
    renderActions("MANAGER", buildReservation("CONFIRMED", "tomorrow"));

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.queryByText(/seat guest/i)).not.toBeInTheDocument();
  });

  it("shows Complete for SEATED reservation", async () => {
    const user = userEvent.setup();
    renderActions("MANAGER", buildReservation("SEATED", "today"));

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.getByText(/mark completed/i)).toBeInTheDocument();
  });

  it("shows Cancel and Switch for STAFF on active reservations", async () => {
    const user = userEvent.setup();
    renderActions("STAFF", buildReservation("CONFIRMED", "today"));

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.getByText(/^cancel$/i)).toBeInTheDocument();
    expect(screen.getByText(/switch table/i)).toBeInTheDocument();
  });
});
