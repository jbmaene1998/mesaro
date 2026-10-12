import { useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { type PermissionKey, hasPermission } from "@/lib/permissions";
import { AuthContext } from "@/stores/auth-context";
import { RestaurantContext } from "@/stores/restaurant-context";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function useRequireAuth() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true, state: { from: location } });
    }
  }, [auth.isAuthenticated, auth.isLoading, location, navigate]);

  return auth.user;
}

export function useUserRole() {
  const { restaurants } = useAuth();
  const selectedRestaurantId = useSelectedRestaurantId();

  if (!selectedRestaurantId) {
    return null;
  }

  const membership = restaurants.find((item) => item.restaurantId === selectedRestaurantId);
  return membership?.role ?? null;
}

export function useSelectedRestaurantId() {
  const restaurantContext = useContext(RestaurantContext);
  return restaurantContext?.currentRestaurant?.id ?? null;
}

export function useMaxRestaurants() {
  const { maxRestaurants, restaurants } = useAuth();
  return { maxRestaurants, currentCount: restaurants.length };
}

export function useHasPermission(permission: PermissionKey) {
  const role = useUserRole();
  return hasPermission(role, permission);
}
