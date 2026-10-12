const ANALYTICS_CONSENT_KEY = "mesaro.analyticsConsent";

export type AnalyticsConsent = "granted" | "denied";

export function getAnalyticsConsent(): AnalyticsConsent | null {
  const value = localStorage.getItem(ANALYTICS_CONSENT_KEY);
  if (value === "granted" || value === "denied") {
    return value;
  }
  return null;
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsent() === "granted";
}
