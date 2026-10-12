import { useMemo, type PropsWithChildren } from "react";
import { Outlet, useParams, useSearchParams } from "react-router-dom";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { useI18n } from "@/i18n";
import type { SupportedLocale } from "@/i18n";

function formatSlugName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function useRestaurantNameFromSlug() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const slug = params.slug ?? searchParams.get("restaurantSlug") ?? searchParams.get("slug") ?? "mesaro";

  return useMemo(() => formatSlugName(slug), [slug]);
}

export function GuestLayout({ children }: PropsWithChildren) {
  const { locale, setLocale, t } = useI18n();
  const poweredBy = locale === "nl" ? "Aangedreven door" : locale === "fr" ? "Propulse par" : locale === "es" ? "Impulsado por" : "Powered by";
  const restaurantName = useRestaurantNameFromSlug();

  return (
    <div className="min-h-screen bg-muted/10 text-foreground">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="truncate text-sm font-medium text-muted-foreground">{restaurantName}</div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="sr-only">{t("common.language")}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as SupportedLocale)}
              aria-label={t("common.language")}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            >
              <option value="en">EN</option>
              <option value="nl">NL</option>
              <option value="fr">FR</option>
              <option value="es">ES</option>
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-[600px] items-center justify-center px-4 py-8">
        {children ?? <Outlet />}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground/80">
        <div className="inline-flex items-center gap-2">
          <span>{poweredBy}</span>
          <BrandLogo imageClassName="h-11" />
        </div>
      </footer>
    </div>
  );
}
