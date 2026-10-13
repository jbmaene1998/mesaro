import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getRestaurants, selectRestaurant as selectRestaurantApi } from "@/api/restaurants";
import type { RestaurantContextItem, RestaurantSummary, UserRestaurant } from "@/api/types";
import { showWarning } from "@/lib/toast";
import { AuthContext } from "@/stores/auth-context";
import { setRestaurantId as setActiveRestaurantId } from "@/stores/restaurant-session";

const SELECTED_RESTAURANT_STORAGE_KEY = "mesaro.selectedRestaurantId";

interface RestaurantState {
  currentRestaurant: RestaurantContextItem | null;
  availableRestaurants: RestaurantContextItem[];
  isLoading: boolean;
  selectRestaurant: (id: string) => Promise<void>;
  refreshContext: () => Promise<void>;
}

export const RestaurantContext = createContext<RestaurantState | undefined>(undefined);

function mergeRestaurants(claimRestaurants: UserRestaurant[], summaries: RestaurantSummary[]) {
  const summaryById = new Map(summaries.map((item) => [item.id, item]));

  return claimRestaurants.map((claim) => {
    const summary = summaryById.get(claim.restaurantId);
    return {
      id: claim.restaurantId,
      slug: summary?.slug ?? claim.restaurantId,
      name: summary?.name ?? `Restaurant ${claim.restaurantId.slice(0, 8)}`,
      timezone: summary?.timezone,
      locale: summary?.locale,
      defaultDurationMinutes: summary?.defaultDurationMinutes,
      role: claim.role
    } satisfies RestaurantContextItem;
  });
}

function getPersistedRestaurantId() {
  return localStorage.getItem(SELECTED_RESTAURANT_STORAGE_KEY);
}

function persistRestaurantId(restaurantId: string | null) {
  if (restaurantId) {
    localStorage.setItem(SELECTED_RESTAURANT_STORAGE_KEY, restaurantId);
  } else {
    localStorage.removeItem(SELECTED_RESTAURANT_STORAGE_KEY);
  }
}

export function RestaurantProvider({ children }: PropsWithChildren) {
  const auth = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [currentRestaurant, setCurrentRestaurant] = useState<RestaurantContextItem | null>(null);
  const [availableRestaurants, setAvailableRestaurants] = useState<RestaurantContextItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const availableRestaurantsRef = useRef<RestaurantContextItem[]>([]);
  const lastRestaurantIdRef = useRef<string | null>(null);

  const applyCurrentRestaurant = useCallback((restaurant: RestaurantContextItem | null) => {
    setCurrentRestaurant(restaurant);
    setActiveRestaurantId(restaurant?.id ?? null);
    persistRestaurantId(restaurant?.id ?? null);
  }, []);

  const refreshContext = useCallback(async () => {
    if (!auth?.isAuthenticated) {
      availableRestaurantsRef.current = [];
      setAvailableRestaurants([]);
      applyCurrentRestaurant(null);
      return;
    }

    setIsLoading(true);
    try {
      let summaries: RestaurantSummary[] = [];
      try {
        summaries = await getRestaurants();
      } catch {
        showWarning("Unable to load restaurants from server. Showing membership-based restaurant list.");
      }
      const merged = mergeRestaurants(auth.restaurants, summaries);
      availableRestaurantsRef.current = merged;
      setAvailableRestaurants(merged);

      if (merged.length === 0) {
        applyCurrentRestaurant(null);
        return;
      }

      const persistedRestaurantId = getPersistedRestaurantId();
      const targetRestaurant =
        merged.find((item) => item.id === currentRestaurant?.id) ??
        merged.find((item) => item.id === persistedRestaurantId) ??
        merged[0];

      if (!targetRestaurant) {
        applyCurrentRestaurant(null);
        return;
      }

      applyCurrentRestaurant(targetRestaurant);

      // One-shot select for server context; skip if already selected to avoid auth refresh loops.
      if (lastRestaurantIdRef.current !== targetRestaurant.id) {
        try {
          const selected = await selectRestaurantApi(targetRestaurant.id);
          auth.setScopedAccessToken(selected.accessToken, selected.expiresIn);
          applyCurrentRestaurant({
            ...targetRestaurant,
            role: selected.role ?? targetRestaurant.role
          });
        } catch {
          // Restaurant id is already applied; admin calls use query restaurantId.
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyCurrentRestaurant, auth, auth?.isAuthenticated, auth?.restaurants, currentRestaurant?.id]);

  const selectRestaurant = useCallback(
    async (id: string) => {
      if (!auth?.isAuthenticated) {
        return;
      }

      setIsLoading(true);
      try {
        const existing = availableRestaurantsRef.current.find((item) => item.id === id);

        if (!existing) {
          applyCurrentRestaurant(null);
          return;
        }

        const selected = await selectRestaurantApi(id);
        auth.setScopedAccessToken(selected.accessToken, selected.expiresIn);

        const nextRestaurant: RestaurantContextItem = {
          ...existing,
          role: selected.role ?? existing.role
        };
        applyCurrentRestaurant(nextRestaurant);

        await queryClient.cancelQueries();
        try {
          await queryClient.invalidateQueries();
          await queryClient.refetchQueries({ type: "active" });
        } catch {
          showWarning("Restaurant changed, but refreshing data failed. Please reload the page.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [applyCurrentRestaurant, auth, queryClient]
  );

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  useEffect(() => {
    const currentId = currentRestaurant?.id ?? null;
    if (!currentId || currentId === lastRestaurantIdRef.current) {
      return;
    }

    lastRestaurantIdRef.current = currentId;
    void queryClient.invalidateQueries();
  }, [currentRestaurant?.id, queryClient]);

  const value = useMemo(
    () => ({
      currentRestaurant,
      availableRestaurants,
      isLoading,
      selectRestaurant,
      refreshContext
    }),
    [availableRestaurants, currentRestaurant, isLoading, refreshContext, selectRestaurant]
  );

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}
