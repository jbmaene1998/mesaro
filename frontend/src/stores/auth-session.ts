interface AuthSessionState {
  accessToken: string | null;
  refreshToken: string | null;
}

const authSessionState: AuthSessionState = {
  accessToken: null,
  refreshToken: null
};

export function getAccessToken() {
  return authSessionState.accessToken;
}

export function getRefreshToken() {
  return authSessionState.refreshToken;
}

export function setAuthSession(accessToken: string | null, refreshToken?: string | null) {
  authSessionState.accessToken = accessToken;
  if (typeof refreshToken !== "undefined") {
    authSessionState.refreshToken = refreshToken;
  }
}

export function clearAuthSession() {
  authSessionState.accessToken = null;
  authSessionState.refreshToken = null;
}
