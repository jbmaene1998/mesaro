const SELECTED_RESTAURANT_STORAGE_KEY = "mesaro.selectedRestaurantId";

let currentRestaurantId: string | null = null;

function readPersistedRestaurantId() {
  try {
    const persisted = window.localStorage.getItem(SELECTED_RESTAURANT_STORAGE_KEY);
    return persisted && persisted.trim().length > 0 ? persisted : null;
  } catch {
    return null;
  }
}

export function getRestaurantId() {
  return currentRestaurantId ?? readPersistedRestaurantId();
}

export function setRestaurantId(restaurantId: string | null) {
  currentRestaurantId = restaurantId;
}
