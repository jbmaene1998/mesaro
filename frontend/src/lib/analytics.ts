import { captureAnalyticsEvent } from "@/api/analytics";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";

const ANALYTICS_EVENT_NAME_PATTERN = /^[a-z0-9_]+$/;
const ANALYTICS_API_ENABLED = import.meta.env.VITE_ANALYTICS_API_ENABLED === "true";

export const ANALYTICS_EVENTS = {
  PAGE_VIEW: "page_view",

  MARKETING_HOME_PRIMARY_CTA_CLICK: "marketing_home_primary_cta_click",
  MARKETING_HOME_SECONDARY_CTA_CLICK: "marketing_home_secondary_cta_click",
  MARKETING_HOME_SIDEPANEL_CTA_CLICK: "marketing_home_sidepanel_cta_click",
  MARKETING_HOME_FAQ_PAGE_CLICK: "marketing_home_faq_page_click",
  MARKETING_HOME_DEMO_CTA_CLICK: "marketing_home_demo_cta_click",
  MARKETING_CONTACT_PRIMARY_CTA_CLICK: "marketing_contact_primary_cta_click",
  MARKETING_CONTACT_FORM_SUBMIT: "marketing_contact_form_submit",
  MARKETING_CONTACT_FORM_SUCCESS: "marketing_contact_form_success",
  MARKETING_CONTACT_FORM_ERROR: "marketing_contact_form_error",
  MARKETING_CONTACT_FORM_VALIDATION_ERROR: "marketing_contact_form_validation_error",

  AUTH_LOGIN_VIEW: "auth_login_view",
  AUTH_LOGIN_SUBMIT: "auth_login_submit",
  AUTH_LOGIN_SUCCESS: "auth_login_success",
  AUTH_LOGIN_FAILURE: "auth_login_failure",
  AUTH_LOGIN_VALIDATION_ERROR: "auth_login_validation_error",
  AUTH_REGISTER_VIEW: "auth_register_view",
  AUTH_REGISTER_STEP_CONTINUE: "auth_register_step_continue",
  AUTH_REGISTER_STEP_BACK: "auth_register_step_back",
  AUTH_REGISTER_SUBMIT: "auth_register_submit",
  AUTH_REGISTER_SUCCESS: "auth_register_success",
  AUTH_REGISTER_VALIDATION_ERROR: "auth_register_validation_error"
} as const;

type AnalyticsPrimitive = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsPrimitive>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function sanitizeProperties(properties: Record<string, unknown> | undefined): AnalyticsProperties {
  if (!properties) {
    return {};
  }

  return Object.entries(properties).reduce<AnalyticsProperties>((acc, [key, value]) => {
    const lowered = key.trim().toLowerCase();
    if (lowered.includes("token") || lowered === "search" || lowered === "query") {
      return acc;
    }
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function isValidAnalyticsEventName(eventName: string) {
  return ANALYTICS_EVENT_NAME_PATTERN.test(eventName);
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!isValidAnalyticsEventName(event)) {
    return false;
  }
  if (!hasAnalyticsConsent()) {
    return false;
  }

  const safeProperties = sanitizeProperties(properties);
  const payload = {
    event,
    ...safeProperties
  };

  window.dispatchEvent(new CustomEvent("analytics:track", { detail: payload }));

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(payload);
  }

  if (ANALYTICS_API_ENABLED) {
    void captureAnalyticsEvent({
      event,
      page: typeof safeProperties.page === "string" ? safeProperties.page : undefined,
      pathname: typeof safeProperties.pathname === "string" ? safeProperties.pathname : undefined,
      properties: safeProperties,
      occurredAt: new Date().toISOString()
    }).catch(() => undefined);
  }

  return true;
}

export function trackPageView(pathname: string) {
  return trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, { pathname });
}
