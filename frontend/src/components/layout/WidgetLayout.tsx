import type { PropsWithChildren } from "react";
import { Outlet } from "react-router-dom";

import { useI18n } from "@/i18n";
import type { SupportedLocale } from "@/i18n";

export function WidgetLayout({ children }: PropsWithChildren) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[560px] justify-end px-3 pt-3 sm:px-4 sm:pt-4">
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
      </header>
      <main className="mx-auto w-full max-w-[560px] p-3 sm:p-4">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
