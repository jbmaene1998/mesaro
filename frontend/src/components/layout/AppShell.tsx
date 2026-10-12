import {
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Grid3X3,
  Clock3,
  Users,
  Palmtree,
  Settings,
  BarChart3,
  ClipboardCheck
} from "lucide-react";
import { useContext, useEffect, useState, type ComponentType, type PropsWithChildren } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { RestaurantSelector } from "@/components/layout/RestaurantSelector";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useIsMobile, useIsTablet } from "@/hooks/use-media-query";
import { useAuth, useUserRole } from "@/hooks/use-auth";
import { PermissionGate, type PermissionKey } from "@/lib/permissions";
import { RestaurantContext } from "@/stores/restaurant-context";
import { useI18n, type SupportedLocale } from "@/i18n";

type RoleLabel = "OWNER" | "MANAGER" | "STAFF";

interface NavItem {
  to: string;
  labelKey:
    | "nav.dashboard"
    | "nav.timeline"
    | "nav.reservations"
    | "nav.tables"
    | "nav.shifts"
    | "nav.planning"
    | "nav.staff"
    | "nav.vacations"
    | "nav.reports"
    | "nav.settings";
  icon: ComponentType<{ className?: string }>;
  permission?: PermissionKey;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/timeline", labelKey: "nav.timeline", icon: Calendar },
  { to: "/reservations", labelKey: "nav.reservations", icon: CalendarCheck },
  { to: "/tables", labelKey: "nav.tables", icon: Grid3X3, permission: "manageTables" },
  { to: "/shifts", labelKey: "nav.shifts", icon: Clock3, permission: "manageShifts" },
  { to: "/planning", labelKey: "nav.planning", icon: ClipboardCheck },
  { to: "/staff", labelKey: "nav.staff", icon: Users, permission: "inviteStaff" },
  { to: "/vacations", labelKey: "nav.vacations", icon: Palmtree },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3, permission: "manageReports" },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, permission: "manageSettings" }
];

function formatRole(role: string | null) {
  if (!role) {
    return "Unknown";
  }

  const lower = role.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function roleBadgeClasses(role: string | null) {
  if (role === "OWNER") {
    return "bg-purple-100 text-purple-800 hover:bg-purple-100";
  }

  if (role === "MANAGER") {
    return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  }

  return "bg-zinc-200 text-zinc-800 hover:bg-zinc-200";
}

function asSupportedLocale(value: string): SupportedLocale {
  if (value === "nl" || value === "fr" || value === "es") {
    return value;
  }
  return "en";
}

function NavItemLink({
  item,
  onNavigate,
  compact = false,
  label
}: {
  item: NavItem;
  onNavigate: () => void;
  compact?: boolean;
  label: string;
}) {
  const Icon = item.icon;

  const content = (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={compact ? label : undefined}
      className={({ isActive }) =>
        `flex items-center rounded-md px-3 py-2 text-sm transition ${
          compact ? "justify-center gap-0 px-2" : "gap-3"
        } ${
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </NavLink>
  );

  if (!item.permission) {
    return content;
  }

  return <PermissionGate permission={item.permission}>{content}</PermissionGate>;
}

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = useUserRole() as RoleLabel | null;
  const restaurantContext = useContext(RestaurantContext);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isTabletOnly = isTablet && !isMobile;
  const { locale, setLocale, t } = useI18n();
  const copy = COPY[locale];

  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabletCollapsed, setTabletCollapsed] = useState(true);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isTabletOnly) {
      setTabletCollapsed(false);
      return;
    }

    setTabletCollapsed(true);
  }, [isTabletOnly]);

  const showOverlay = isMobile && mobileOpen;
  const showDrawer = isMobile;
  const collapsed = isTabletOnly ? tabletCollapsed : false;
  const shouldBlockProtectedContent = Boolean(
    restaurantContext && (restaurantContext.isLoading || !restaurantContext.currentRestaurant)
  );

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <div className="flex min-h-screen">
        {showOverlay ? (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
          />
        ) : null}

        <aside
          className={`flex h-screen flex-col overflow-y-auto border-r bg-background p-4 transition-all ${
            showDrawer
              ? `fixed left-0 top-0 z-40 w-72 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`
              : `sticky top-0 z-20 ${collapsed ? "w-20" : "w-72"}`
          }`}
        >
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between md:justify-start"}`}>
            <div className={collapsed ? "hidden" : ""}>
              <BrandLogo imageClassName="h-10 w-auto" />
              <h1 className="text-lg font-semibold">{copy.adminConsole}</h1>
            </div>
            {collapsed ? <p className="text-xs font-semibold uppercase text-muted-foreground">Mesaro</p> : null}
            {showDrawer ? (
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(false)} aria-label={copy.closeMenu}>
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <Separator className="my-4" />

          <nav className={`space-y-1 ${shouldBlockProtectedContent ? "pointer-events-none opacity-30" : ""}`}>
            {NAV_ITEMS.map((item) => (
              <NavItemLink
                key={item.to}
                item={item}
                label={t(item.labelKey)}
                onNavigate={() => setMobileOpen(false)}
                compact={collapsed}
              />
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="border-b bg-background/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
              <div className="flex min-w-0 items-center gap-2 md:gap-3">
                {isMobile ? (
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label={copy.openMenu}>
                    <Menu className="h-5 w-5" />
                  </Button>
                ) : null}
                {isTabletOnly ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:inline-flex"
                    onClick={() => setTabletCollapsed((value) => !value)}
                    aria-label={collapsed ? copy.expandSidebar : copy.collapseSidebar}
                  >
                    {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  </Button>
                ) : null}
                <RestaurantSelector />
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <span className="text-xs text-muted-foreground">{t("common.language")}</span>
                <select
                  value={locale}
                  onChange={(event) => setLocale(asSupportedLocale(event.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  aria-label={t("common.language")}
                >
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                  <option value="fr">Francais</option>
                  <option value="es">Espanol</option>
                </select>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="max-w-[260px] justify-start truncate">
                    {user?.email ?? copy.account}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="space-y-1">
                    <p className="text-sm font-medium leading-snug">{user?.email ?? copy.unknownUser}</p>
                    {role ? (
                      <div>
                        <Badge className={roleBadgeClasses(role)}>{formatRole(role)}</Badge>
                      </div>
                    ) : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/account")}>
                    {t("account.myAccount")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void logout()} className="text-destructive focus:text-destructive">
                    {t("account.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            {shouldBlockProtectedContent ? (
              restaurantContext?.isLoading ? (
                <PageLoader />
              ) : (
                <div className="mx-auto max-w-xl">
                  <Card>
                    <CardHeader>
                      <CardTitle>{copy.noRestaurantSelected}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {copy.selectRestaurantHint}
                    </CardContent>
                  </Card>
                </div>
              )
            ) : (
              <ErrorBoundary>{children ?? <Outlet />}</ErrorBoundary>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const COPY = {
  en: {
    adminConsole: "Admin Console",
    closeMenu: "Close menu",
    openMenu: "Open menu",
    expandSidebar: "Expand sidebar",
    collapseSidebar: "Collapse sidebar",
    account: "Account",
    unknownUser: "Unknown user",
    noRestaurantSelected: "No restaurant selected",
    selectRestaurantHint: "Select a restaurant from the top-left menu to load operational data."
  },
  nl: {
    adminConsole: "Admin console",
    closeMenu: "Menu sluiten",
    openMenu: "Menu openen",
    expandSidebar: "Zijbalk uitklappen",
    collapseSidebar: "Zijbalk inklappen",
    account: "Account",
    unknownUser: "Onbekende gebruiker",
    noRestaurantSelected: "Geen restaurant geselecteerd",
    selectRestaurantHint: "Selecteer een restaurant linksboven om operationele data te laden."
  },
  fr: {
    adminConsole: "Console admin",
    closeMenu: "Fermer le menu",
    openMenu: "Ouvrir le menu",
    expandSidebar: "Developper la barre laterale",
    collapseSidebar: "Reduire la barre laterale",
    account: "Compte",
    unknownUser: "Utilisateur inconnu",
    noRestaurantSelected: "Aucun restaurant selectionne",
    selectRestaurantHint: "Selectionnez un restaurant en haut a gauche pour charger les donnees operationnelles."
  },
  es: {
    adminConsole: "Consola admin",
    closeMenu: "Cerrar menu",
    openMenu: "Abrir menu",
    expandSidebar: "Expandir barra lateral",
    collapseSidebar: "Contraer barra lateral",
    account: "Cuenta",
    unknownUser: "Usuario desconocido",
    noRestaurantSelected: "No hay restaurante seleccionado",
    selectRestaurantHint: "Selecciona un restaurante en el menu superior izquierdo para cargar datos operativos."
  }
} as const;
