export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  message?: string;
  timestamp: string;
}

export enum ApiErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  RATE_LIMITED = "RATE_LIMITED",
  HOLD_EXPIRED = "HOLD_EXPIRED",
  HOLD_INVALID = "HOLD_INVALID",
  RESTAURANT_CLOSED = "RESTAURANT_CLOSED",
  CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED",
  BILLING_LIMIT_EXCEEDED = "BILLING_LIMIT_EXCEEDED",
  BILLING_ACCESS_BLOCKED = "BILLING_ACCESS_BLOCKED",
  INTERNAL_ERROR = "INTERNAL_ERROR"
}

export interface AppError {
  status: number;
  code: ApiErrorCode | string;
  message: string;
  field?: string;
  retryAfterSeconds?: number;
  timestamp: string;
  originalError?: unknown;
}

export type ReservationStatus = "CONFIRMED" | "SEATED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
export type UserRole = "OWNER" | "MANAGER" | "STAFF";
export type TableStatus = "AVAILABLE" | "UNAVAILABLE";
export type ShiftStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type VacationType = "RESTAURANT_CLOSURE" | "STAFF_VACATION";
export type ClosureReason = "HOLIDAY" | "MAINTENANCE" | "PRIVATE" | "OTHER";
export type VacationReason = "VACATION" | "SICK" | "PERSONAL" | "OTHER";
export type VacationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'PAUSED';

export interface RestaurantSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  locale: string;
  bookingEnabled: boolean;
  slotIntervalMinutes: number;
  defaultDurationMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  maxPartySize: number;
  assignmentMode: string;
  billingStatus: SubscriptionStatus;
  trialEndsAt: string | null;
}

export interface DiningTable {
  id: string;
  restaurantId: string;
  label: string;
  seats: number;
  status: TableStatus;
}

export interface TableCombination {
  id: string;
  restaurantId: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  totalSeats: number;
  tables: DiningTable[];
}

export interface Shift {
  id: string;
  restaurantId: string;
  name: string;
  dayOfWeek: number;
  dayOfWeekName: string;
  startTime: string;
  endTime: string;
  lastReservationTime: string;
  maxCovers: number;
  slotDurationMinutes: number;
  status: ShiftStatus;
}

export interface StaffPlanningAssignment {
  assignmentId: string;
  userId: string;
  email: string;
  fullName?: string | null;
  role: UserRole;
  startTime: string;
  endTime: string;
}

export interface StaffPlanningStaff {
  userId: string;
  email: string;
  fullName?: string | null;
  role: UserRole;
}

export interface StaffPlanningUnavailableStaff extends StaffPlanningStaff {
  reason: "ON_VACATION" | "RESTAURANT_CLOSED" | string;
}

export interface StaffPlanningShift {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  assignedStaff: StaffPlanningAssignment[];
  availableStaff: StaffPlanningStaff[];
  unavailableStaff: StaffPlanningUnavailableStaff[];
}

export interface StaffPlanningDay {
  restaurantId: string;
  serviceDate: string;
  restaurantClosed: boolean;
  closureReason?: string | null;
  shifts: StaffPlanningShift[];
}

export interface StaffWeeklyWorkHours {
  userId: string;
  email: string;
  fullName?: string | null;
  role: UserRole;
  plannedHours: number;
}

export interface RecurringAssignmentSkipped {
  serviceDate: string;
  reason: string;
}

export interface AssignStaffRecurringWeekResult {
  userId: string;
  referenceShiftId: string;
  weekStartDate: string;
  assignedCount: number;
  assignedDates: string[];
  skipped: RecurringAssignmentSkipped[];
}

export interface Reservation {
  id: string;
  confirmationCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  date: string;
  time: string;
  timezone: string;
  startAtUtc: string;
  endAtUtc: string;
  status: ReservationStatus;
  shiftName: string;
  tableLabels: string[];
  notes: string | null;
}

export interface UserRestaurant {
  restaurantId: string;
  role: UserRole;
}

export interface RestaurantContextItem {
  id: string;
  slug: string;
  name: string;
  timezone?: string;
  locale?: string;
  role: UserRole;
}

export interface Vacation {
  id: string;
  restaurantId: string;
  userId: string;
  requesterName?: string | null;
  requesterEmail?: string | null;
  type: VacationType;
  reason: ClosureReason | VacationReason;
  startDate: string;
  endDate: string;
  notes: string | null;
  status: VacationStatus;
  approvedBy: string | null;
  approvedByName?: string | null;
  approvedAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SelectedRestaurantResponse {
  accessToken: string;
  expiresIn: number;
  restaurantId: string;
  role: UserRole;
}

export interface AppContextResponse {
  restaurantId: string;
  restaurantSlug?: string;
  restaurantName?: string;
  role?: UserRole;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  restaurants: UserRestaurant[];
}

export interface OpeningHoursDay {
  dayOfWeek: number;
  dayName: string;
  open: boolean;
  openLocalTime: string | null;
  closeLocalTime: string | null;
}
