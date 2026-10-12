import { ChevronDown } from "lucide-react";
import { useContext } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { RestaurantContext } from "@/stores/restaurant-context";

function roleBadgeClasses(role: string) {
  if (role === "OWNER") {
    return "bg-purple-100 text-purple-800 hover:bg-purple-100";
  }

  if (role === "MANAGER") {
    return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  }

  return "bg-zinc-200 text-zinc-800 hover:bg-zinc-200";
}

function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function RestaurantSelector() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const restaurantContext = useContext(RestaurantContext);

  if (!restaurantContext) {
    return null;
  }

  const { currentRestaurant, availableRestaurants, isLoading, selectRestaurant } = restaurantContext;

  if (!currentRestaurant && availableRestaurants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{copy.noRestaurants}</span>
      </div>
    );
  }

  if (availableRestaurants.length <= 1 && currentRestaurant) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{currentRestaurant.name}</span>
        <Badge className={roleBadgeClasses(currentRestaurant.role)}>{roleLabel(currentRestaurant.role)}</Badge>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 justify-between gap-2 min-w-[220px]">
          <span className="truncate">{currentRestaurant?.name ?? copy.selectRestaurant}</span>
          <div className="flex items-center gap-2">
            {currentRestaurant ? (
              <Badge className={roleBadgeClasses(currentRestaurant.role)}>{roleLabel(currentRestaurant.role)}</Badge>
            ) : null}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        {availableRestaurants.map((restaurant) => (
          <DropdownMenuItem
            key={restaurant.id}
            className="flex items-center justify-between gap-3"
            disabled={isLoading}
            onClick={() => void selectRestaurant(restaurant.id)}
          >
            <span className="truncate">{restaurant.name}</span>
            <Badge className={roleBadgeClasses(restaurant.role)}>{roleLabel(restaurant.role)}</Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const COPY = {
  en: {
    noRestaurants: "No restaurants",
    selectRestaurant: "Select restaurant"
  },
  nl: {
    noRestaurants: "Geen restaurants",
    selectRestaurant: "Selecteer restaurant"
  },
  fr: {
    noRestaurants: "Aucun restaurant",
    selectRestaurant: "Selectionner un restaurant"
  },
  es: {
    noRestaurants: "No hay restaurantes",
    selectRestaurant: "Seleccionar restaurante"
  }
} as const;
