import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { RestaurantContext } from "@/stores/restaurant-context";
import { messages, type SupportedLocale } from "@/i18n/messages";

const STORAGE_KEY = "mesaro.locale";

interface I18nState {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  syncLocale: (locale: SupportedLocale) => void;
  t: (key: keyof typeof messages.en) => string;
}

const I18nContext = createContext<I18nState | undefined>(undefined);

function normalizeLocale(input?: string | null): SupportedLocale {
  const normalized = (input ?? "").toLowerCase();
  if (normalized.startsWith("nl")) {
    return "nl";
  }
  if (normalized.startsWith("fr")) {
    return "fr";
  }
  if (normalized.startsWith("es")) {
    return "es";
  }
  return "en";
}

function readLocaleFromUrl(): SupportedLocale | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("lang");
  if (!param) return null;
  return normalizeLocale(param);
}

export function I18nProvider({ children }: PropsWithChildren) {
  const restaurantContext = useContext(RestaurantContext);
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const fromUrl = readLocaleFromUrl();
    if (fromUrl) return fromUrl;
    return normalizeLocale(localStorage.getItem(STORAGE_KEY));
  });
  const [manuallySet, setManuallySet] = useState(() => {
    if (readLocaleFromUrl()) return true;
    return Boolean(localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    const fromUrl = readLocaleFromUrl();
    if (!fromUrl) return;
    setLocaleState(fromUrl);
    setManuallySet(true);
    localStorage.setItem(STORAGE_KEY, fromUrl);
  }, []);

  useEffect(() => {
    if (manuallySet) {
      return;
    }
    const next = normalizeLocale(restaurantContext?.currentRestaurant?.locale);
    setLocaleState(next);
  }, [manuallySet, restaurantContext?.currentRestaurant?.locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (value: SupportedLocale) => {
    setLocaleState(value);
    setManuallySet(true);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const syncLocale = (value: SupportedLocale) => {
    setLocaleState(value);
  };

  const value = useMemo<I18nState>(() => ({
    locale,
    setLocale,
    syncLocale,
    t: (key) => messages[locale][key] ?? messages.en[key]
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export type { SupportedLocale };
