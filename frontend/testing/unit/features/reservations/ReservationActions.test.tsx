import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { Reservation, UserRole } from "@/api/types";
import { ReservationActions } from "@/features/reservations/components/ReservationActions";
import { I18nProvider } from "@/i18n";
import { AuthContext } from "@/stores/auth-context";
import { RestaurantContext } from "@/stores/restaurant-context";

function buildReservation(status: Reservation["status"]): Reservation {
  return {
    id: "res-1",
    confirmationCode: "ABC123",
    guestName: "Jane Doe",
    guestEmail: "jane@example.com",
    guestPhone: "+15550001111",
    partySize: 2,
    date: "2026-01-01",
    time: "18:00",
    timezone: "UTC",
    startAtUtc: "2026-01-01T18:00:00Z",
    endAtUtc: "2026-01-01T19:30:00Z",
    status,
    shiftName: "Dinner",
    tableLabels: ["T1"],
    notes: null
  };
}

function renderActions(role: UserRole, status: Reservation["status"]) {
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
    currentRestaurant: { id: "r-1", slug: "demo", name: "Demo", role },
    availableRestaurants: [{ id: "r-1", slug: "demo", name: "Demo", role }],
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
              <ReservationActions reservation={buildReservation(status)} onViewDetails={vi.fn()} />
            </MemoryRouter>
          </I18nProvider>
        </RestaurantContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("ReservationActions", () => {
  it("shows Seat for CONFIRMED reservation", async () => {
    const user = userEvent.setup();
    renderActions("MANAGER", "CONFIRMED");

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.getByText(/seat guest/i)).toBeInTheDocument();
  });

  it("shows Complete for SEATED reservation", async () => {
    const user = userEvent.setup();
    renderActions("MANAGER", "SEATED");

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.getByText(/mark completed/i)).toBeInTheDocument();
  });

  it("hides Cancel for STAFF role", async () => {
    const user = userEvent.setup();
    renderActions("STAFF", "CONFIRMED");

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.queryByText(/^cancel$/i)).not.toBeInTheDocument();
  });

  it("shows Cancel for MANAGER role", async () => {
    const user = userEvent.setup();
    renderActions("MANAGER", "CONFIRMED");

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.getByText(/^cancel$/i)).toBeInTheDocument();
  });

  it("shows Switch Table for MANAGER when reservation is active", async () => {
    const user = userEvent.setup();
    renderActions("MANAGER", "SEATED");

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.getByText(/switch table/i)).toBeInTheDocument();
  });

  it("hides Switch Table for STAFF role", async () => {
    const user = userEvent.setup();
    renderActions("STAFF", "CONFIRMED");

    await user.click(screen.getByRole("button", { name: /reservation actions/i }));

    expect(screen.queryByText(/switch table/i)).not.toBeInTheDocument();
  });
});
