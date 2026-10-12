import { format, subDays } from "date-fns";

import { apiClient } from "@/api/client";
import type { ApiResponse, AppError } from "@/api/types";
import { getRestaurantId } from "@/stores/restaurant-session";

export interface ReportTotals {
  totalReservations: number;
  totalCovers: number;
  averagePartySize: number;
  noShowRatePercent: number;
  cancellationRatePercent: number;
}

export interface ReportDailyRow {
  date: string;
  reservations: number;
  covers: number;
  noShows: number;
  cancellations: number;
}

export interface ReportShiftRow {
  shiftName: string;
  reservations: number;
  covers: number;
  noShows: number;
  cancellations: number;
}

export interface ReportSummary {
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  totals: ReportTotals;
  statusBreakdown: Record<string, number>;
  dailyBreakdown: ReportDailyRow[];
  shiftBreakdown: ReportShiftRow[];
}

export interface ReportCsvExport {
  blob: Blob;
  fileName: string | null;
}

function unwrapResponse<T>(response: ApiResponse<T> | T): T {
  if (typeof response === "object" && response !== null && "success" in response) {
    const envelope = response as ApiResponse<T>;
    if (envelope.success && envelope.data !== null) {
      return envelope.data;
    }

    const appError: AppError = {
      status: 400,
      code: envelope.error?.code ?? "UNKNOWN",
      message: envelope.error?.message ?? envelope.message ?? "Request failed",
      field: envelope.error?.field,
      timestamp: envelope.timestamp
    };
    throw appError;
  }

  return response as T;
}

function requireRestaurantId() {
  const restaurantId = getRestaurantId();
  if (!restaurantId) {
    throw new Error("No restaurant selected");
  }
  return restaurantId;
}

export function defaultReportRange() {
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 29), "yyyy-MM-dd");
  return { startDate, endDate };
}

export function extractFilenameFromDisposition(contentDisposition?: string): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ""));
      return decoded.length > 0 ? decoded : null;
    } catch {
      return null;
    }
  }

  const asciiMatch = contentDisposition.match(/filename\s*=\s*("?)([^";]+)\1/i);
  if (asciiMatch?.[2]) {
    const name = asciiMatch[2].trim();
    return name.length > 0 ? name : null;
  }

  return null;
}

export async function getReportSummary(startDate: string, endDate: string): Promise<ReportSummary> {
  const restaurantId = requireRestaurantId();
  const { data } = await apiClient.get<ApiResponse<ReportSummary> | ReportSummary>("/reports/summary", {
    params: {
      restaurantId,
      startDate,
      endDate
    }
  });
  const summary = unwrapResponse(data) as ReportSummary & { restaurantId?: string | number };
  return {
    ...summary,
    restaurantId: String(summary.restaurantId ?? restaurantId)
  };
}

export async function exportReportCsv(startDate: string, endDate: string): Promise<ReportCsvExport> {
  const restaurantId = requireRestaurantId();
  const response = await apiClient.get("/reports/export.csv", {
    params: {
      restaurantId,
      startDate,
      endDate
    },
    responseType: "blob"
  });
  const rawDisposition = response.headers["content-disposition"];
  const contentDisposition = Array.isArray(rawDisposition) ? rawDisposition[0] : rawDisposition;

  return {
    blob: response.data as Blob,
    fileName: extractFilenameFromDisposition(contentDisposition)
  };
}
