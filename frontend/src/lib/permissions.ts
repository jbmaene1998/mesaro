import { useContext, type ReactNode } from "react";

import type { UserRole } from "@/api/types";
import { AuthContext } from "@/stores/auth-context";
import { RestaurantContext } from "@/stores/restaurant-context";

export const PERMISSIONS = {
  viewReservations: ["OWNER", "MANAGER", "STAFF"],
  createWalkIn: ["OWNER", "MANAGER", "STAFF"],
  updateStatus: ["OWNER", "MANAGER", "STAFF"],
  cancelReservation: ["OWNER", "MANAGER", "STAFF"],
  switchTables: ["OWNER", "MANAGER", "STAFF"],
  manageShifts: ["OWNER", "MANAGER"],
  manageTables: ["OWNER", "MANAGER"],
  inviteStaff: ["OWNER", "MANAGER"],
  inviteManager: ["OWNER"],
  manageSettings: ["OWNER"],
  manageReports: ["OWNER", "MANAGER"],
  approveVacation: ["OWNER", "MANAGER"],
  createClosure: ["OWNER", "MANAGER"]
} as const satisfies Record<string, UserRole[]>;

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole | null | undefined, permission: PermissionKey) {
  if (!role) {
    return false;
  }

  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function PermissionGate({ permission, children }: { permission: PermissionKey; children: ReactNode }) {
  const auth = useContext(AuthContext);
  const restaurantContext = useContext(RestaurantContext);

  if (!auth || !restaurantContext?.currentRestaurant?.id) {
    return null;
  }

  const membership = auth.restaurants.find(
    (restaurant) => restaurant.restaurantId === restaurantContext.currentRestaurant?.id
  );

  return hasPermission(membership?.role, permission) ? children : null;
}
