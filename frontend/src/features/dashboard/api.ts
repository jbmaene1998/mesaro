import { format, startOfMonth, startOfWeek } from "date-fns";

import { apiClient } from "@/api/client";
import type { ApiResponse, AppError, ReservationStatus } from "@/api/types";
import { getRestaurantId } from "@/stores/restaurant-session";

export interface ShiftSummary {
  name: string;
  startTime: string;
  endTime: string;
  covers: number;
  maxCovers: number;
}

export interface DashboardData {
  totalReservations: number;
  totalCovers: number;
  byStatus: {
    confirmed: number;
    seated: number;
    completed: number;
    noShow: number;
    cancelled: number;
  };
  shifts: ShiftSummary[];
}

export interface CurrentShiftData {
  name: string;
  covers: number;
  maxCovers: number;
  availableSlots: number;
}

export interface StatusBreakdown {
  confirmed: number;
  seated: number;
  completed: number;
  noShow: number;
  cancelled: number;
}

export interface ShiftStat {
  name: string;
  reservations: number;
  covers: number;
}

export interface DailyStats {
  date: string;
  totalReservations: number;
  totalCovers: number;
  byStatus: StatusBreakdown;
  byShift: ShiftStat[];
}

export interface StatsTotals {
  totalReservations: number;
  totalCovers: number;
  noShow: number;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  dailyBreakdown: DailyStats[];
  totals: StatsTotals;
}

export interface MonthlyStats {
  month: number;
  year: number;
  weeklyBreakdown: WeeklyStats[];
  totals: StatsTotals;
}

export interface UpcomingReservationItem {
  id: string;
  time: string;
  guestName: string;
  partySize: number;
  status: ReservationStatus;
  shiftName: string | null;
  tableLabels: string[];
}

export type LiveServiceStatus = "AVAILABLE" | "ARRIVING_SOON" | "OCCUPIED" | "RESERVED_LATER" | "UNAVAILABLE";

export interface LiveServiceReservationItem {
  id: string;
  guestName: string;
  partySize: number;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
}

export interface LiveServiceTableItem {
  tableId: string;
  label: string;
  seats: number;
  status: LiveServiceStatus;
  activeReservation: LiveServiceReservationItem | null;
  nextReservation: LiveServiceReservationItem | null;
  turnMinutes: number | null;
  expectedTurnMinutes: number | null;
  overstayMinutes: number | null;
}

export interface LiveServiceViewData {
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  generatedAt: string;
  tables: LiveServiceTableItem[];
}

export interface PortfolioRestaurantSummary {
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  date: string;
  totalReservations: number;
  totalCovers: number;
  noShowCount: number;
  currentShiftName: string | null;
  currentShiftCovers: number | null;
  currentShiftMaxCovers: number | null;
}

export interface PortfolioDashboardData {
  generatedAt: string;
  restaurants: PortfolioRestaurantSummary[];
  totals: {
    totalRestaurants: number;
    totalReservations: number;
    totalCovers: number;
    totalNoShows: number;
  };
}

interface BackendDailyStats {
  date: string;
  totalReservations: number;
  totalCovers: number;
  byStatus: Record<string, number>;
}

interface BackendShiftStatus {
  shiftName: string;
  maxCovers: number;
  currentCovers: number;
  availableCovers: number;
}

interface BackendDashboardResponse {
  stats: BackendDailyStats;
}

interface BackendWeeklyStatsResponse {
  startDate: string;
  endDate: string;
  days: BackendDailyStats[];
}

interface BackendMonthlyStatsResponse {
  startDate: string;
  endDate: string;
  days: BackendDailyStats[];
}

interface BackendUpcomingReservation {
  id: number;
  time: string;
  guestName: string;
  partySize: number;
  status: ReservationStatus;
  shiftName: string | null;
  tableLabels: string[];
}

interface BackendLiveServiceReservation {
  id: number;
  guestName: string;
  partySize: number;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
}

interface BackendLiveServiceTable {
  tableId: number;
  label: string;
  seats: number;
  status: LiveServiceStatus;
  activeReservation: BackendLiveServiceReservation | null;
  nextReservation: BackendLiveServiceReservation | null;
  turnMinutes: number | null;
  expectedTurnMinutes: number | null;
  overstayMinutes: number | null;
}

interface BackendLiveServiceView {
  restaurantId: number;
  restaurantName: string;
  timezone: string;
  generatedAt: string;
  tables: BackendLiveServiceTable[];
}

interface BackendPortfolioRestaurantSummary {
  restaurantId: number;
  restaurantName: string;
  timezone: string;
  date: string;
  totalReservations: number;
  totalCovers: number;
  noShowCount: number;
  currentShiftName: string | null;
  currentShiftCovers: number | null;
  currentShiftMaxCovers: number | null;
}

interface BackendPortfolioDashboard {
  generatedAt: string;
  restaurants: BackendPortfolioRestaurantSummary[];
  totals: {
    totalRestaurants: number;
    totalReservations: number;
    totalCovers: number;
    totalNoShows: number;
  };
}

function unwrapResponse<T>(response: ApiResponse<T> | T, allowNull = false): T {
  if (typeof response === "object" && response !== null && "success" in response) {
    const envelope = response as ApiResponse<T>;
    if (envelope.success && (envelope.data !== null || allowNull)) {
      return envelope.data as T;
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

function toStatusBreakdown(byStatus: Record<string, number>): StatusBreakdown {
  return {
    confirmed: byStatus.CONFIRMED ?? 0,
    seated: byStatus.SEATED ?? 0,
    completed: byStatus.COMPLETED ?? 0,
    noShow: byStatus.NO_SHOW ?? 0,
    cancelled: byStatus.CANCELLED ?? 0
  };
}

function toDailyStats(stats: BackendDailyStats): DailyStats {
  return {
    date: stats.date,
    totalReservations: stats.totalReservations,
    totalCovers: stats.totalCovers,
    byStatus: toStatusBreakdown(stats.byStatus ?? {}),
    byShift: []
  };
}

function toTotals(days: DailyStats[]): StatsTotals {
  return days.reduce<StatsTotals>(
    (acc, day) => ({
      totalReservations: acc.totalReservations + day.totalReservations,
      totalCovers: acc.totalCovers + day.totalCovers,
      noShow: acc.noShow + day.byStatus.noShow
    }),
    { totalReservations: 0, totalCovers: 0, noShow: 0 }
  );
}

function requireRestaurantId() {
  const restaurantId = getRestaurantId();
  if (!restaurantId) {
    throw new Error("No restaurant selected");
  }
  return restaurantId;
}

export async function getDashboard(date?: string): Promise<DashboardData> {
  const restaurantId = requireRestaurantId();
  const effectiveDate = date ?? format(new Date(), "yyyy-MM-dd");

  const { data } = await apiClient.get<ApiResponse<BackendDashboardResponse> | BackendDashboardResponse>("/dashboard", {
    params: {
      restaurantId,
      date: effectiveDate
    }
  });

  const dashboard = unwrapResponse(data);
  return {
    totalReservations: dashboard.stats?.totalReservations ?? 0,
    totalCovers: dashboard.stats?.totalCovers ?? 0,
    byStatus: toStatusBreakdown(dashboard.stats?.byStatus ?? {}),
    shifts: []
  };
}

export async function getCurrentShift(): Promise<CurrentShiftData | null> {
  const restaurantId = requireRestaurantId();

  const { data } = await apiClient.get<ApiResponse<BackendShiftStatus | null> | BackendShiftStatus | null>(
    "/dashboard/shift/current",
    {
      params: {
        restaurantId
      }
    }
  );

  const shift = unwrapResponse(data, true);
  if (!shift) {
    return null;
  }

  return {
    name: shift.shiftName,
    covers: shift.currentCovers,
    maxCovers: shift.maxCovers,
    availableSlots: shift.availableCovers
  };
}

export async function getUpcomingReservations(): Promise<UpcomingReservationItem[]> {
  const restaurantId = requireRestaurantId();

  const { data } = await apiClient.get<ApiResponse<BackendUpcomingReservation[]> | BackendUpcomingReservation[]>(
    "/dashboard/upcoming",
    {
      params: {
        restaurantId
      }
    }
  );

  return unwrapResponse(data).map((reservation) => ({
    id: String(reservation.id),
    time: reservation.time,
    guestName: reservation.guestName,
    partySize: reservation.partySize,
    status: reservation.status,
    shiftName: reservation.shiftName,
    tableLabels: reservation.tableLabels ?? []
  }));
}

export async function getLiveServiceView(): Promise<LiveServiceViewData> {
  const restaurantId = requireRestaurantId();

  const { data } = await apiClient.get<ApiResponse<BackendLiveServiceView> | BackendLiveServiceView>(
    "/dashboard/live-service",
    {
      params: {
        restaurantId
      }
    }
  );

  const view = unwrapResponse(data);
  return {
    restaurantId: String(view.restaurantId),
    restaurantName: view.restaurantName,
    timezone: view.timezone,
    generatedAt: view.generatedAt,
    tables: (view.tables ?? []).map((table) => ({
      tableId: String(table.tableId),
      label: table.label,
      seats: table.seats,
      status: table.status,
      activeReservation: table.activeReservation
        ? {
            id: String(table.activeReservation.id),
            guestName: table.activeReservation.guestName,
            partySize: table.activeReservation.partySize,
            startTime: table.activeReservation.startTime,
            endTime: table.activeReservation.endTime,
            status: table.activeReservation.status
          }
        : null,
      nextReservation: table.nextReservation
        ? {
            id: String(table.nextReservation.id),
            guestName: table.nextReservation.guestName,
            partySize: table.nextReservation.partySize,
            startTime: table.nextReservation.startTime,
            endTime: table.nextReservation.endTime,
            status: table.nextReservation.status
          }
        : null,
      turnMinutes: table.turnMinutes,
      expectedTurnMinutes: table.expectedTurnMinutes,
      overstayMinutes: table.overstayMinutes
    }))
  };
}

export async function getPortfolioDashboard(date?: string): Promise<PortfolioDashboardData> {
  const { data } = await apiClient.get<ApiResponse<BackendPortfolioDashboard> | BackendPortfolioDashboard>(
    "/dashboard/portfolio",
    {
      params: date ? { date } : undefined
    }
  );

  const portfolio = unwrapResponse(data);
  return {
    generatedAt: portfolio.generatedAt,
    restaurants: (portfolio.restaurants ?? []).map((item) => ({
      restaurantId: String(item.restaurantId),
      restaurantName: item.restaurantName,
      timezone: item.timezone,
      date: item.date,
      totalReservations: item.totalReservations,
      totalCovers: item.totalCovers,
      noShowCount: item.noShowCount,
      currentShiftName: item.currentShiftName,
      currentShiftCovers: item.currentShiftCovers,
      currentShiftMaxCovers: item.currentShiftMaxCovers
    })),
    totals: portfolio.totals
  };
}

export async function getDailyStats(date: string): Promise<DailyStats> {
  const restaurantId = requireRestaurantId();

  const { data } = await apiClient.get<ApiResponse<BackendDailyStats> | BackendDailyStats>("/stats/daily", {
    params: {
      restaurantId,
      date
    }
  });

  return toDailyStats(unwrapResponse(data));
}

export async function getWeeklyStats(weekStart?: string): Promise<WeeklyStats> {
  const restaurantId = requireRestaurantId();
  const effectiveDate = weekStart ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data } = await apiClient.get<ApiResponse<BackendWeeklyStatsResponse> | BackendWeeklyStatsResponse>("/stats/weekly", {
    params: {
      restaurantId,
      date: effectiveDate
    }
  });

  const weekly = unwrapResponse(data);
  const dailyBreakdown = (weekly.days ?? []).map(toDailyStats);
  return {
    weekStart: weekly.startDate,
    weekEnd: weekly.endDate,
    dailyBreakdown,
    totals: toTotals(dailyBreakdown)
  };
}

export async function getMonthlyStats(month?: string): Promise<MonthlyStats> {
  const restaurantId = requireRestaurantId();
  const effectiveDate = month ?? format(startOfMonth(new Date()), "yyyy-MM-dd");

  const { data } = await apiClient.get<ApiResponse<BackendMonthlyStatsResponse> | BackendMonthlyStatsResponse>(
    "/stats/monthly",
    {
      params: {
        restaurantId,
        date: effectiveDate
      }
    }
  );

  const monthly = unwrapResponse(data);
  const dailyBreakdown = (monthly.days ?? []).map(toDailyStats);
  const weeks = new Map<string, DailyStats[]>();

  for (const day of dailyBreakdown) {
    const weekStart = format(startOfWeek(new Date(day.date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const existing = weeks.get(weekStart);
    if (existing) {
      existing.push(day);
    } else {
      weeks.set(weekStart, [day]);
    }
  }

  const weeklyBreakdown = Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, days]) => {
      const weekEnd = days[days.length - 1]?.date ?? weekStart;
      return {
        weekStart,
        weekEnd,
        dailyBreakdown: days,
        totals: toTotals(days)
      };
    });

  const firstDay = dailyBreakdown[0]?.date ?? monthly.startDate;
  const parsedFirstDay = new Date(firstDay);
  return {
    month: parsedFirstDay.getMonth() + 1,
    year: parsedFirstDay.getFullYear(),
    weeklyBreakdown,
    totals: toTotals(dailyBreakdown)
  };
}
