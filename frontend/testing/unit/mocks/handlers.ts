import { http, HttpResponse } from "msw";

import { DEFAULT_API_URL } from "@/lib/constants";

function encodeBase64Url(input: object) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

function createJwt(payload: Record<string, unknown>) {
  const header = encodeBase64Url({ alg: "HS256", typ: "JWT" });
  const body = encodeBase64Url(payload);
  return `${header}.${body}.signature`;
}

const now = Math.floor(Date.now() / 1000);

export const mockSlots = [
  { time: "18:00", shift: "Dinner", available: true },
  { time: "18:30", shift: "Dinner", available: false, unavailableReason: "FULL" },
  { time: "19:00", shift: "Dinner", available: true }
];

export const handlers = [
  http.get(`${DEFAULT_API_URL}/availability`, () =>
    HttpResponse.json({
      success: true,
      data: {
        restaurantName: "Demo Bistro",
        restaurantSlug: "demo",
        timezone: "UTC",
        slots: mockSlots
      },
      error: null,
      timestamp: new Date().toISOString()
    })
  ),
  http.get(`${DEFAULT_API_URL}/availability/closed`, () =>
    HttpResponse.json({
      success: true,
      data: { closed: false },
      error: null,
      timestamp: new Date().toISOString()
    })
  ),
  http.post(`${DEFAULT_API_URL}/holds`, async () =>
    HttpResponse.json({
      success: true,
      data: {
        holdToken: "hold-token-123",
        expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString()
      },
      error: null,
      timestamp: new Date().toISOString()
    })
  ),
  http.get(`${DEFAULT_API_URL}/admin/reservations`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
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
          status: "CONFIRMED",
          shiftName: "Dinner",
          tableLabels: ["T1"],
          notes: null
        }
      ],
      error: null,
      timestamp: new Date().toISOString()
    })
  ),
  http.post(`${DEFAULT_API_URL}/auth/login`, async () =>
    HttpResponse.json({
      success: true,
      data: {
        accessToken: createJwt({
          sub: "user-1",
          email: "manager@example.com",
          restaurants: [{ restaurantId: "r-1", role: "MANAGER" }],
          exp: now + 3600
        }),
        refreshToken: "refresh-token-123",
        expiresIn: 3600
      },
      error: null,
      timestamp: new Date().toISOString()
    })
  )
];
