export interface HoldSessionState {
  expiresAt: string;
  date?: string;
  time?: string;
  partySize?: number;
  restaurantName?: string;
}

const HOLD_SESSION_PREFIX = "booking.holdContext.";
const CANCEL_TOKEN_PREFIX = "booking.cancelToken.";

function readFromSessionStorage(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToSessionStorage(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
}

function removeFromSessionStorage(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function holdSessionKey(holdToken: string) {
  return `${HOLD_SESSION_PREFIX}${holdToken}`;
}

export function cancelTokenSessionKey(confirmationCode: string) {
  return `${CANCEL_TOKEN_PREFIX}${confirmationCode}`;
}

export function saveHoldSession(holdToken: string, state: HoldSessionState) {
  if (!holdToken || !state.expiresAt) {
    return;
  }
  writeToSessionStorage(holdSessionKey(holdToken), JSON.stringify(state));
}

export function readHoldSession(holdToken: string): HoldSessionState | null {
  if (!holdToken) {
    return null;
  }

  const raw = readFromSessionStorage(holdSessionKey(holdToken));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as HoldSessionState;
    return parsed.expiresAt ? parsed : null;
  } catch {
    return null;
  }
}

export function clearHoldSession(holdToken: string) {
  if (!holdToken) {
    return;
  }
  removeFromSessionStorage(holdSessionKey(holdToken));
}

export function saveCancelToken(confirmationCode: string, cancelToken: string) {
  if (!confirmationCode || !cancelToken) {
    return;
  }
  writeToSessionStorage(cancelTokenSessionKey(confirmationCode), cancelToken);
}

export function readCancelToken(confirmationCode: string) {
  if (!confirmationCode) {
    return undefined;
  }
  return readFromSessionStorage(cancelTokenSessionKey(confirmationCode)) ?? undefined;
}
