import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn()
}));

vi.mock("@/api/client", () => ({
  apiClient: {
    get: getMock
  }
}));

vi.mock("@/stores/restaurant-session", () => ({
  getRestaurantId: () => "7"
}));

import { getTableStatus } from "@/features/reservations/api";

describe("reservations api table status", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("does not send unsupported partySize query param to backend table status endpoint", async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        data: []
      }
    });

    await getTableStatus({
      date: "2026-02-20",
      startTime: "18:00",
      endTime: "19:30",
      partySize: 4
    });

    expect(getMock).toHaveBeenCalledWith("/restaurants/7/tables/status", {
      params: {
        date: "2026-02-20",
        startTime: "18:00",
        endTime: "19:30"
      }
    });
  });
});
