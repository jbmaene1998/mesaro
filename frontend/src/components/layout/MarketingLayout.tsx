import { Menu, X } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState, type PropsWithChildren } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { SmoothScroll } from "@/features/marketing/motion/SmoothScroll";
import "@/features/marketing/marketing.css";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

const MARKETING_LINKS = [
  { to: "/", labelKey: "marketing.nav.home" as const },
  { to: "/features", labelKey: "marketing.nav.features" as const },
  { to: "/pricing", labelKey: "marketing.nav.pricing" as const },
  { to: "/about", labelKey: "marketing.nav.about" as const },
  { to: "/faq", labelKey: "marketing.nav.faq" as const },
  { to: "/contact", labelKey: "marketing.nav.contact" as const }
];

function NavItems({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { t } = useI18n();
  return (
    <>
      {MARKETING_LINKS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "text-sm tracking-wide transition-colors",
              isActive ? "text-[var(--mk-brass)]" : "text-[var(--mk-pewter)] hover:text-[var(--mk-mist)]",
              className
            )
          }
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </>
  );
}

export function MarketingLayout({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const copy = COPY[locale];
  const location = useLocation();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 24);
  });

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="marketing-root min-h-screen">
      <SmoothScroll>
        <header
          className={cn(
            "sticky top-0 z-50 transition-[background,border-color,backdrop-filter] duration-300",
            scrolled
              ? "border-b border-[var(--mk-line)] bg-[rgba(246,239,230,0.9)] backdrop-blur-xl"
              : "border-b border-transparent bg-transparent"
          )}
        >
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-20">
            <Link
              to="/"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-brass)]"
            >
              <BrandLogo imageClassName="h-10 sm:h-12" />
            </Link>

            <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
              <NavItems />
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <select
                value={locale}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "nl" || value === "fr" || value === "es") setLocale(value);
                  else setLocale("en");
                }}
                className="h-9 rounded-full border border-[var(--mk-line)] bg-transparent px-3 text-xs text-[var(--mk-pewter)]"
                aria-label={t("common.language")}
              >
                <option value="en">EN</option>
                <option value="nl">NL</option>
                <option value="fr">FR</option>
                <option value="es">ES</option>
              </select>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="mk-btn-primary inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
                >
                  {t("marketing.goToDashboard")}
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3 text-sm text-[var(--mk-pewter)] transition-colors hover:text-[var(--mk-mist)]"
                  >
                    {t("common.logIn")}
                  </Link>
                  <Link
                    to="/register"
                    className="mk-btn-primary inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
                  >
                    {t("common.startNow")}
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--mk-line)] text-[var(--mk-olive)] md:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label={mobileOpen ? copy.closeMenu : copy.openMenu}
              aria-expanded={mobileOpen}
              aria-controls="mobile-marketing-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileOpen ? (
            <motion.div
              id="mobile-marketing-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-[var(--mk-line)] bg-[var(--mk-sand)] md:hidden"
            >
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5">
                <nav aria-label="Mobile navigation" className="flex flex-col gap-3">
                  <NavItems onNavigate={() => setMobileOpen(false)} />
                </nav>
                <div className="flex flex-col gap-2 pt-1">
                  {isAuthenticated ? (
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="mk-btn-primary inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold"
                    >
                      {t("marketing.goToDashboard")}
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setMobileOpen(false)}
                        className="mk-btn-ghost inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold"
                      >
                        {t("common.logIn")}
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setMobileOpen(false)}
                        className="mk-btn-primary inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold"
                      >
                        {t("common.startNow")}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </header>

        <main>{children ?? <Outlet />}</main>

        <footer className="mt-20 border-t border-[var(--mk-line)]">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <BrandLogo imageClassName="h-10" />
              <p className="mt-4 max-w-sm text-sm text-[var(--mk-pewter)]">{t("marketing.footerTagline")}</p>
            </div>
            <nav className="flex flex-wrap gap-5 text-sm text-[var(--mk-pewter)]">
              <Link to="/privacy" className="hover:text-[var(--mk-mist)]">
                {t("marketing.privacy")}
              </Link>
              <Link to="/terms" className="hover:text-[var(--mk-mist)]">
                {t("marketing.terms")}
              </Link>
              <Link to="/contact" className="hover:text-[var(--mk-mist)]">
                {t("marketing.nav.contact")}
              </Link>
            </nav>
          </div>
        </footer>
      </SmoothScroll>
    </div>
  );
}

const COPY = {
  en: { closeMenu: "Close menu", openMenu: "Open menu" },
  nl: { closeMenu: "Menu sluiten", openMenu: "Menu openen" },
  fr: { closeMenu: "Fermer le menu", openMenu: "Ouvrir le menu" },
  es: { closeMenu: "Cerrar menu", openMenu: "Abrir menu" }
} as const;
