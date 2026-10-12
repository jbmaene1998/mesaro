import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GuestBookingPage } from "@/features/booking/GuestBookingPage";
import { I18nProvider } from "@/i18n";
import { DEFAULT_API_URL } from "@/lib/constants";
import { server } from "../../setup";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={["/r/demo"]}>
          <Routes>
            <Route path="/r/:slug" element={<GuestBookingPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  navigateMock.mockReset();
});

describe("GuestBookingPage", () => {
  it("renders date picker, party size control, and availability action", async () => {
    renderPage();

    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /check|beschikbaarheid|disponibilite|disponibilidad/i })).toBeInTheDocument();
  });

  it("shows availability slots after checking", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /check|beschikbaarheid|disponibilite|disponibilidad/i }));

    expect(await screen.findByRole("heading", { name: /dinner/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /18:00/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /19:00/i })).toBeInTheDocument();
  });

  it("keeps full slots disabled and not clickable", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /check|beschikbaarheid|disponibilite|disponibilidad/i }));

    const fullSlot = await screen.findByRole("button", { name: /18:30/i });
    expect(fullSlot).toBeDisabled();
  });

  it("shows closed message when restaurant is closed", async () => {
    server.use(
      http.get(`${DEFAULT_API_URL}/availability/closed`, () =>
        HttpResponse.json({
          success: true,
          data: { closed: true, reason: "Holiday closure" },
          error: null,
          timestamp: new Date().toISOString()
        })
      )
    );

    renderPage();

    expect(await screen.findByText(/restaurant closed/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /check|beschikbaarheid|disponibilite|disponibilidad/i })).toBeDisabled();
  });

  it("creates hold on slot click", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /check|beschikbaarheid|disponibilite|disponibilidad/i }));
    await user.click(await screen.findByRole("button", { name: /18:00/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/r/demo/confirm/hold-token-123", expect.any(Object));
    });
  });
});
