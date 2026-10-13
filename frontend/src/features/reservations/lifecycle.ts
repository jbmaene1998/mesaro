import { formatInTimeZone } from "date-fns-tz";

import type { Reservation, ReservationStatus } from "@/api/types";

export type LifecycleAction = "seat" | "complete" | "noshow" | "cancel" | "switch";

export interface LifecycleDecision {
  allowed: boolean;
  reason?: string;
}

function restaurantToday(timezone: string, now = new Date()): string {
  return formatInTimeZone(now, timezone || "UTC", "yyyy-MM-dd");
}

export function canSeatReservation(reservation: Pick<Reservation, "status" | "date" | "timezone" | "endAtUtc">, now = new Date()): LifecycleDecision {
  if (reservation.status !== "CONFIRMED") {
    return { allowed: false, reason: "Only confirmed reservations can be seated." };
  }

  const tz = reservation.timezone || "UTC";
  const today = restaurantToday(tz, now);
  if (reservation.date > today) {
    return { allowed: false, reason: "Cannot seat before the reservation’s service day." };
  }

  if (reservation.endAtUtc && new Date(reservation.endAtUtc).getTime() <= now.getTime()) {
    return { allowed: false, reason: "Cannot seat after the reservation end time." };
  }

  return { allowed: true };
}

export function canMarkNoShow(reservation: Pick<Reservation, "status" | "startAtUtc">, now = new Date()): LifecycleDecision {
  if (reservation.status !== "CONFIRMED") {
    return { allowed: false, reason: "Only confirmed reservations can be marked no-show." };
  }
  if (reservation.startAtUtc && new Date(reservation.startAtUtc).getTime() > now.getTime()) {
    return { allowed: false, reason: "Cannot mark no-show before the reservation start time." };
  }
  return { allowed: true };
}

export function canCompleteReservation(reservation: Pick<Reservation, "status">): LifecycleDecision {
  if (reservation.status !== "SEATED") {
    return { allowed: false, reason: "Only seated reservations can be completed." };
  }
  return { allowed: true };
}

export function canCancelReservation(reservation: Pick<Reservation, "status">): LifecycleDecision {
  if (reservation.status !== "CONFIRMED") {
    return { allowed: false, reason: "Only confirmed reservations can be cancelled." };
  }
  return { allowed: true };
}

export function canSwitchTables(reservation: Pick<Reservation, "status">): LifecycleDecision {
  const status: ReservationStatus = reservation.status;
  if (status !== "CONFIRMED" && status !== "SEATED") {
    return { allowed: false, reason: "Tables can only be switched for active reservations." };
  }
  return { allowed: true };
}
