const FIRST_RUN_PENDING_KEY = "mesaro.staff.firstRun.pending";
const FIRST_RUN_DONE_PREFIX = "mesaro.staff.firstRun.done.";

export type WalkthroughRole = "OWNER" | "MANAGER" | "STAFF";

export function markStaffFirstRunPending() {
  sessionStorage.setItem(FIRST_RUN_PENDING_KEY, "1");
}

export function clearStaffFirstRunPending() {
  sessionStorage.removeItem(FIRST_RUN_PENDING_KEY);
}

export function isStaffFirstRunPending() {
  return sessionStorage.getItem(FIRST_RUN_PENDING_KEY) === "1";
}

export function isStaffFirstRunDone(userId: string, restaurantId: string) {
  return localStorage.getItem(`${FIRST_RUN_DONE_PREFIX}${userId}.${restaurantId}`) === "1";
}

export function markStaffFirstRunDone(userId: string, restaurantId: string) {
  clearStaffFirstRunPending();
  localStorage.setItem(`${FIRST_RUN_DONE_PREFIX}${userId}.${restaurantId}`, "1");
}

export function shouldShowStaffFirstRun(options: {
  userId?: string | null;
  restaurantId?: string | null;
  role?: string | null;
  forceFromQuery?: boolean;
}) {
  const { userId, restaurantId, role, forceFromQuery } = options;
  if (!userId || !restaurantId) {
    return false;
  }
  if (role !== "STAFF" && role !== "MANAGER" && role !== "OWNER") {
    return false;
  }
  if (isStaffFirstRunDone(userId, restaurantId)) {
    return false;
  }
  return Boolean(forceFromQuery) || isStaffFirstRunPending();
}
