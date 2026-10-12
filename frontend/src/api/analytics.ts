import { apiClient } from "@/api/client";

export interface AnalyticsCaptureRequest {
  event: string;
  page?: string;
  pathname?: string;
  properties?: Record<string, string | number | boolean | null>;
  occurredAt: string;
}

export async function captureAnalyticsEvent(payload: AnalyticsCaptureRequest) {
  await apiClient.post("/analytics/events", payload);
}

