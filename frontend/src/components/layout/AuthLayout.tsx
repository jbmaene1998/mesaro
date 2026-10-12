import type { PropsWithChildren } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { useI18n } from "@/i18n";

export function AuthLayout({ children }: PropsWithChildren) {
  const { locale } = useI18n();
  const location = useLocation();
  const title = locale === "nl" ? "Personeelsconsole" : locale === "fr" ? "Console equipe" : locale === "es" ? "Consola de personal" : "Staff Console";
  const isRegisterPage = location.pathname === "/register";

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <div className={`mx-auto flex min-h-screen w-full flex-col justify-center px-4 py-10 ${isRegisterPage ? "max-w-[900px]" : "max-w-[400px]"}`}>
        <div className="mb-6 flex w-full flex-col items-center justify-center text-center">
          <BrandLogo className="w-full justify-center" imageClassName="mx-auto h-14 w-auto" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        {children ?? <Outlet />}
      </div>
    </div>
  );
}
