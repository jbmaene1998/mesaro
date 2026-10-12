import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteMock, postMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  postMock: vi.fn()
}));

vi.mock("@/api/client", () => ({
  apiClient: {
    delete: deleteMock,
    post: postMock
  }
}));

vi.mock("@/stores/restaurant-session", () => ({
  getRestaurantId: () => "7"
}));

import { assignStaffToShiftForWeek, removeStaffAssignment } from "@/features/shifts/planning-api";

describe("planning-api", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    deleteMock.mockResolvedValue({ data: undefined });
    postMock.mockReset();
  });

  it("deletes a staff assignment using the backend route contract", async () => {
    await removeStaffAssignment("99");

    expect(deleteMock).toHaveBeenCalledWith("/staff-planning/assignments/99");
  });

  it("posts recurring week assignment using backend route contract", async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          userId: "22",
          referenceShiftId: "10",
          weekStartDate: "2026-02-16",
          assignedCount: 5,
          assignedDates: ["2026-02-16"],
          skipped: []
        },
        error: null,
        timestamp: "2026-02-20T00:00:00Z"
      }
    });

    await assignStaffToShiftForWeek({ shiftId: "10", userId: "22", serviceDate: "2026-02-16" });

    expect(postMock).toHaveBeenCalledWith(
      "/restaurants/7/staff-planning/assignments/recurring-week",
      { shiftId: "10", userId: "22", serviceDate: "2026-02-16" }
    );
  });
});
