import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ReservationDetailsPage } from "@/features/booking/ReservationDetailsPage";

const getReservationByCode = vi.fn();
const cancelReservation = vi.fn();

vi.mock("@/features/booking/api", () => ({
  getReservationByCode: (...args: unknown[]) => getReservationByCode(...args),
  cancelReservation: (...args: unknown[]) => cancelReservation(...args)
}));

vi.mock("@/features/booking/components/ReservationStatusCard", () => ({
  ReservationStatusCard: () => <div>Reservation status</div>
}));

vi.mock("@/i18n", () => ({
  useI18n: () => ({ locale: "en" })
}));

function renderPage(initialEntry: string | { pathname: string; search?: string; state?: unknown }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry as never]}>
        <Routes>
          <Route path="/r/:slug/reservation/:code" element={<ReservationDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getReservationByCode.mockReset();
  cancelReservation.mockReset();
  sessionStorage.clear();
  getReservationByCode.mockResolvedValue({
    confirmationCode: "RES-1",
    partySize: 2,
    date: "2026-03-01",
    time: "12:00",
    timezone: "UTC",
    status: "CONFIRMED",
    shiftName: "Lunch",
    tableLabels: ["T1"]
  });
});

describe("ReservationDetailsPage token resolution", () => {
  it("uses navigation-state token first", async () => {
    renderPage({ pathname: "/r/test/reservation/RES-1", state: { cancelToken: "nav-token" } });

    await waitFor(() => {
      expect(getReservationByCode).toHaveBeenCalledWith("RES-1", "nav-token");
    });
  });

  it("falls back to sessionStorage token", async () => {
    sessionStorage.setItem("booking.cancelToken.RES-1", "stored-token");
    renderPage("/r/test/reservation/RES-1");

    await waitFor(() => {
      expect(getReservationByCode).toHaveBeenCalledWith("RES-1", "stored-token");
    });
  });

  it("falls back to legacy query token", async () => {
    renderPage("/r/test/reservation/RES-1?cancelToken=legacy-token");

    await waitFor(() => {
      expect(getReservationByCode).toHaveBeenCalledWith("RES-1", "legacy-token");
    });
  });

  it("accepts email-style token query param", async () => {
    renderPage("/r/test/reservation/RES-1?token=email-token");

    await waitFor(() => {
      expect(getReservationByCode).toHaveBeenCalledWith("RES-1", "email-token");
    });
  });
});
