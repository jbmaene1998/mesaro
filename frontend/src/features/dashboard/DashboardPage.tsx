import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CalendarDays, PlusCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton, TableSkeleton } from "@/components/ui/loading";
import type { Reservation, ReservationStatus } from "@/api/types";
import { billingApi } from "@/api/billing";
import {
  getCurrentShift,
  getDashboard,
  getLiveServiceView,
  getPortfolioDashboard,
  type LiveServiceTableItem
} from "@/features/dashboard/api";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { StatsSection } from "@/features/dashboard/StatsSection";
import { OnboardingChecklist } from "@/features/onboarding/OnboardingChecklist";
import { useOnboardingStatus } from "@/features/onboarding/hooks/useOnboardingStatus";
import { getReservations } from "@/features/reservations/api";
import { ManualReservationDialog } from "@/features/reservations/components/ManualReservationDialog";
import { ReservationActions } from "@/features/reservations/components/ReservationActions";
import { WalkInDialog } from "@/features/reservations/components/WalkInDialog";
import { useAuth, useSelectedRestaurantId, useUserRole } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { showSuccess, showWarning } from "@/lib/toast";
import { RestaurantContext } from "@/stores/restaurant-context";

const TRIAL_STARTED_FLAG_PREFIX = "mesaro.trial.started.";
const TRIAL_ENDING_TOAST_PREFIX = "mesaro.trial.ending.shown.";
const TRIAL_ENDING_REMINDER_DAYS = 3;

function statusBadgeClasses(status: ReservationStatus) {
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  if (status === "SEATED") return "bg-success/15 text-success hover:bg-success/15";
  if (status === "COMPLETED") return "bg-zinc-200 text-zinc-800 hover:bg-zinc-200";
  if (status === "CANCELLED") return "bg-red-100 text-red-800 hover:bg-red-100";
  return "bg-orange-100 text-orange-800 hover:bg-orange-100";
}

function liveStatusClasses(status: LiveServiceTableItem["status"]) {
  if (status === "AVAILABLE") return "bg-emerald-100 text-emerald-800";
  if (status === "ARRIVING_SOON") return "bg-amber-100 text-amber-900";
  if (status === "OCCUPIED") return "bg-rose-100 text-rose-900";
  if (status === "RESERVED_LATER") return "bg-slate-100 text-slate-700";
  return "bg-zinc-200 text-zinc-800";
}

function liveStatusLabel(
  status: LiveServiceTableItem["status"],
  t: (key: keyof typeof import("@/i18n/messages").messages.en) => string
) {
  const key = `dashboard.liveStatus.${status}` as keyof typeof import("@/i18n/messages").messages.en;
  return t(key);
}

function interpolateTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function formatShiftCapacitySubLabel(
  t: (key: keyof typeof import("@/i18n/messages").messages.en) => string,
  currentShift: { name: string } | null | undefined,
  dashboard: { totalReservations?: number; shifts?: { name: string }[] } | null | undefined
) {
  if (currentShift?.name) {
    return currentShift.name;
  }

  const reservationCount = dashboard?.totalReservations ?? 0;
  const shiftNames = (dashboard?.shifts ?? []).map((shift) => shift.name).filter(Boolean);

  if (reservationCount > 0 && shiftNames.length > 0) {
    return interpolateTemplate(t("dashboard.offShiftWithShifts"), {
      count: reservationCount,
      shifts: shiftNames.join(", ")
    });
  }

  if (reservationCount > 0) {
    return interpolateTemplate(t("dashboard.offShiftWithReservations"), { count: reservationCount });
  }

  return t("dashboard.noActiveShift");
}

export function DashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const restaurantContext = useContext(RestaurantContext);
  const role = useUserRole();
  const selectedRestaurantId = useSelectedRestaurantId();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [openWalkIn, setOpenWalkIn] = useState(false);
  const [openManualReservation, setOpenManualReservation] = useState(false);
  const [isChecklistDismissed, setIsChecklistDismissed] = useState(false);
  const onboarding = useOnboardingStatus(role === "OWNER");
  const dismissalStorageKey = selectedRestaurantId
    ? `mesaro.onboarding.dismissed.${selectedRestaurantId}`
    : null;

  useEffect(() => {
    if (!dismissalStorageKey) {
      setIsChecklistDismissed(false);
      return;
    }

    setIsChecklistDismissed(localStorage.getItem(dismissalStorageKey) === "1");
  }, [dismissalStorageKey]);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", selectedRestaurantId, selectedDate],
    queryFn: () => getDashboard(selectedDate),
    enabled: Boolean(selectedRestaurantId),
    staleTime: 0,
    refetchInterval: 30_000
  });

  const currentShiftQuery = useQuery({
    queryKey: ["dashboard-current-shift", selectedRestaurantId],
    queryFn: getCurrentShift,
    enabled: Boolean(selectedRestaurantId),
    staleTime: 0,
    refetchInterval: 30_000
  });

  const reservationsPanelQuery = useQuery({
    queryKey: ["dashboard-reservations-panel", selectedRestaurantId, selectedDate],
    queryFn: () => getReservations({ date: selectedDate, statuses: ["CONFIRMED", "SEATED"] }),
    enabled: Boolean(selectedRestaurantId),
    refetchInterval: 30_000
  });

  const liveServiceQuery = useQuery({
    queryKey: ["dashboard-live-service", selectedRestaurantId],
    queryFn: getLiveServiceView,
    enabled: Boolean(selectedRestaurantId),
    staleTime: 0,
    refetchInterval: 30_000
  });

  const portfolioQuery = useQuery({
    queryKey: ["dashboard-portfolio", selectedRestaurantId],
    queryFn: () => getPortfolioDashboard(selectedDate),
    enabled: role === "OWNER" && auth.restaurants.length > 1,
    refetchInterval: 60_000
  });

  const reservationsForPanels = useMemo<Reservation[]>(
    () => [...(reservationsPanelQuery.data ?? [])].sort((a, b) => a.time.localeCompare(b.time)),
    [reservationsPanelQuery.data]
  );
  const upcomingReservations = useMemo<Reservation[]>(
    () => reservationsForPanels.slice(0, 10),
    [reservationsForPanels]
  );
  const newReservations = useMemo<Reservation[]>(
    () => reservationsForPanels.filter((reservation) => reservation.status === "CONFIRMED").slice(0, 10),
    [reservationsForPanels]
  );

  const shiftCapacitySubLabel = useMemo(
    () => formatShiftCapacitySubLabel(t, currentShiftQuery.data, dashboardQuery.data),
    [currentShiftQuery.data, dashboardQuery.data, t]
  );

  const showOnboardingChecklist = role === "OWNER" && !onboarding.isComplete && !isChecklistDismissed;
  const showOnboardingResume = role === "OWNER" && !onboarding.isComplete && isChecklistDismissed;
  const billingStatusQuery = useQuery({
    queryKey: ["billing", "status", selectedRestaurantId],
    queryFn: () => billingApi.getStatus(selectedRestaurantId!),
    enabled: role === "OWNER" && Boolean(selectedRestaurantId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (role !== "OWNER" || !selectedRestaurantId || !billingStatusQuery.data) {
      return;
    }

    const trialStartedFlagKey = `${TRIAL_STARTED_FLAG_PREFIX}${selectedRestaurantId}`;
    if (sessionStorage.getItem(trialStartedFlagKey) === "1" && billingStatusQuery.data.status === "TRIALING") {
      const endsAt = billingStatusQuery.data.trialEndsAt
        ? new Date(billingStatusQuery.data.trialEndsAt).toLocaleDateString()
        : null;
      const message = endsAt
        ? `Your free trial has started and ends on ${endsAt}.`
        : "Your free trial has started.";
      showSuccess(message);
      sessionStorage.removeItem(trialStartedFlagKey);
    }

    if (billingStatusQuery.data.status !== "TRIALING" || !billingStatusQuery.data.trialEndsAt) {
      return;
    }

    const daysLeft = Math.ceil((new Date(billingStatusQuery.data.trialEndsAt).getTime() - Date.now()) / 86_400_000);
    if (daysLeft > TRIAL_ENDING_REMINDER_DAYS) {
      return;
    }

    const loginKeySuffix = auth.refreshToken?.slice(-12) ?? "session";
    const endingToastSessionKey = `${TRIAL_ENDING_TOAST_PREFIX}${selectedRestaurantId}.${loginKeySuffix}`;
    if (sessionStorage.getItem(endingToastSessionKey) === "1") {
      return;
    }

    const endsAt = new Date(billingStatusQuery.data.trialEndsAt).toLocaleDateString();
    const message = daysLeft <= 0
      ? `Your free trial has ended (${endsAt}). Please subscribe to keep access.`
      : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${endsAt}).`;
    showWarning(message);
    sessionStorage.setItem(endingToastSessionKey, "1");
  }, [auth.refreshToken, billingStatusQuery.data, role, selectedRestaurantId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="dashboard-date" className="text-sm font-medium">
            {t("common.date")}
          </label>
          <input
            id="dashboard-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm md:h-9"
          />
        </div>
      </div>

      <h2 className="sr-only">{t("dashboard.dailyMetrics")}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4" role="status" aria-live="polite" aria-atomic="true">
        {dashboardQuery.isLoading || currentShiftQuery.isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={CalendarDays}
              label={t("dashboard.totalReservations")}
              value={dashboardQuery.data?.totalReservations ?? "-"}
              subLabel={selectedDate}
            />
            <StatCard
              icon={Users}
              label={t("dashboard.totalCovers")}
              value={dashboardQuery.data?.totalCovers ?? "-"}
              subLabel={t("dashboard.guestsExpected")}
            />
            <StatCard
              icon={CalendarClock}
              label={t("dashboard.currentShiftCapacity")}
              value={currentShiftQuery.data ? `${currentShiftQuery.data.covers}/${currentShiftQuery.data.maxCovers}` : "-"}
              subLabel={shiftCapacitySubLabel}
              progress={{
                value: currentShiftQuery.data?.covers ?? 0,
                max: currentShiftQuery.data?.maxCovers ?? 0
              }}
            />
            <StatCard
              icon={AlertTriangle}
              label={t("dashboard.noShows")}
              value={dashboardQuery.data?.byStatus?.noShow ?? 0}
              warning={(dashboardQuery.data?.byStatus?.noShow ?? 0) > 0}
            />
          </>
        )}
      </div>

      {dashboardQuery.isError || currentShiftQuery.isError ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{t("dashboard.errorLoadStats")}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void dashboardQuery.refetch()}>
                {t("dashboard.retryStats")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void currentShiftQuery.refetch()}>
                {t("dashboard.retryShift")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showOnboardingChecklist ? (
        <OnboardingChecklist
          requiredSteps={onboarding.requiredSteps}
          optionalSteps={onboarding.optionalSteps}
          nextStep={onboarding.nextStep}
          completedCount={onboarding.completedCount}
          totalCount={onboarding.totalCount}
          isLoading={onboarding.isLoading}
          hasError={onboarding.hasError}
          onDismiss={() => {
            if (dismissalStorageKey) {
              localStorage.setItem(dismissalStorageKey, "1");
            }
            setIsChecklistDismissed(true);
          }}
        />
      ) : null}

      {showOnboardingResume ? (
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Onboarding hidden</CardTitle>
            <CardDescription>
              You still have setup tasks before launch: {onboarding.completedCount}/{onboarding.totalCount} required steps complete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (dismissalStorageKey) {
                  localStorage.removeItem(dismissalStorageKey);
                }
                setIsChecklistDismissed(false);
              }}
            >
              Resume onboarding
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {role === "OWNER" && auth.restaurants.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.multiTitle")}</CardTitle>
            <CardDescription>{t("dashboard.multiDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolioQuery.isLoading ? <CardSkeleton /> : null}
            {portfolioQuery.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{t("dashboard.errorLoadPortfolio")}</p>
                <Button variant="outline" size="sm" onClick={() => void portfolioQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              </div>
            ) : null}
            {!portfolioQuery.isLoading && !portfolioQuery.isError && portfolioQuery.data ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("dashboard.restaurants")}</p>
                    <p className="text-lg font-semibold">{portfolioQuery.data.totals.totalRestaurants}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("dashboard.totalReservations")}</p>
                    <p className="text-lg font-semibold">{portfolioQuery.data.totals.totalReservations}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("dashboard.totalCovers")}</p>
                    <p className="text-lg font-semibold">{portfolioQuery.data.totals.totalCovers}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("dashboard.totalNoShows")}</p>
                    <p className="text-lg font-semibold">{portfolioQuery.data.totals.totalNoShows}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {portfolioQuery.data.restaurants.map((restaurant) => {
                    const isSelected = restaurant.restaurantId === selectedRestaurantId;
                    return (
                      <div key={restaurant.restaurantId} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{restaurant.restaurantName}</p>
                            <p className="text-xs text-muted-foreground">{restaurant.timezone}</p>
                          </div>
                          {isSelected ? <Badge>{t("common.current")}</Badge> : null}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">{t("common.reservations")}</p>
                            <p className="font-medium">{restaurant.totalReservations}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("common.covers")}</p>
                            <p className="font-medium">{restaurant.totalCovers}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("dashboard.noShows")}</p>
                            <p className="font-medium">{restaurant.noShowCount}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {restaurant.currentShiftName && restaurant.currentShiftCovers !== null && restaurant.currentShiftMaxCovers !== null
                            ? `Current shift: ${restaurant.currentShiftName} (${restaurant.currentShiftCovers}/${restaurant.currentShiftMaxCovers})`
                            : t("dashboard.noActiveShift")}
                        </p>
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant={isSelected ? "outline" : "default"}
                            size="sm"
                            onClick={() => {
                              if (!restaurantContext) {
                                return;
                              }
                              void restaurantContext.selectRestaurant(restaurant.restaurantId);
                            }}
                            disabled={isSelected || !restaurantContext || restaurantContext.isLoading}
                          >
                            {t("dashboard.switchOpen")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <ErrorBoundary level="section">
        <StatsSection />
      </ErrorBoundary>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.liveTitle")}</CardTitle>
          <CardDescription>{t("dashboard.liveDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {liveServiceQuery.isLoading ? <CardSkeleton /> : null}

          {liveServiceQuery.isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{t("dashboard.errorLoadLive")}</p>
              <Button variant="outline" size="sm" onClick={() => void liveServiceQuery.refetch()}>
                {t("common.retry")}
              </Button>
            </div>
          ) : null}

          {!liveServiceQuery.isLoading && !liveServiceQuery.isError && (liveServiceQuery.data?.tables.length ?? 0) === 0 ? (
            <EmptyState title={t("dashboard.noTablesTitle")} description={t("dashboard.noTablesDescription")} />
          ) : null}

          {!liveServiceQuery.isLoading && !liveServiceQuery.isError && (liveServiceQuery.data?.tables.length ?? 0) > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("dashboard.autoRefresh")} {new Date(liveServiceQuery.data?.generatedAt ?? Date.now()).toLocaleTimeString()}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(liveServiceQuery.data?.tables ?? []).map((table) => (
                  <div key={table.tableId} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{table.label}</p>
                        <p className="text-xs text-muted-foreground">{table.seats} {t("common.seats")}</p>
                      </div>
                      <Badge className={liveStatusClasses(table.status)}>{liveStatusLabel(table.status, t)}</Badge>
                    </div>

                    {table.activeReservation ? (
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="font-medium">
                          {table.activeReservation.guestName} - {t("common.party")} {table.activeReservation.partySize}
                        </p>
                        <p className="text-muted-foreground">
                          {table.activeReservation.startTime} - {table.activeReservation.endTime}
                        </p>
                        <p className={table.overstayMinutes && table.overstayMinutes > 0 ? "font-medium text-orange-700" : "text-muted-foreground"}>
                          {t("dashboard.turn")}: {table.turnMinutes ?? 0}m / {table.expectedTurnMinutes ?? 0}m
                          {table.overstayMinutes && table.overstayMinutes > 0 ? ` - ${t("dashboard.overstay")} +${table.overstayMinutes}m` : ""}
                        </p>
                      </div>
                    ) : null}

                    {!table.activeReservation && table.nextReservation ? (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {table.nextReservation.guestName} - {t("common.party")} {table.nextReservation.partySize}
                        </p>
                        <p>
                          {table.nextReservation.startTime} - {table.nextReservation.endTime}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <h2 className="sr-only">{t("dashboard.operations")}</h2>
      <div className="grid gap-6 xl:grid-cols-[2fr,2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.newReservationsTitle")}</CardTitle>
            <CardDescription>{t("dashboard.newReservationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {reservationsPanelQuery.isLoading ? <TableSkeleton /> : null}

            {reservationsPanelQuery.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{t("dashboard.errorLoadNewReservations")}</p>
                <Button variant="outline" size="sm" onClick={() => void reservationsPanelQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              </div>
            ) : null}

            {!reservationsPanelQuery.isLoading && !reservationsPanelQuery.isError && newReservations.length === 0 ? (
              <EmptyState
                title={t("dashboard.noReservationsTitle")}
                description={t("dashboard.noNewReservationsDescription")}
              />
            ) : null}

            {!reservationsPanelQuery.isError && newReservations.length > 0 ? (
              <div className="space-y-2">
                {newReservations.map((reservation) => (
                  <div key={reservation.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {reservation.time} - {reservation.guestName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("common.party")} {reservation.partySize}
                          {reservation.tableLabels?.length ? ` | ${reservation.tableLabels.join(", ")}` : ""}
                        </p>
                      </div>
                      <Badge className={statusBadgeClasses(reservation.status)}>
                        <span className="sr-only">{t("common.status")}: </span>
                        {reservation.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/reservations/${reservation.id}`)}>
                        {t("dashboard.viewReservation")}
                      </Button>
                      <ReservationActions
                        reservation={reservation}
                        onViewDetails={(reservationId) => navigate(`/reservations/${reservationId}`)}
                        onUpdated={() => {
                          void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
                          void queryClient.invalidateQueries({ queryKey: ["dashboard-reservations-panel", selectedRestaurantId] });
                          void queryClient.invalidateQueries({ queryKey: ["dashboard-live-service", selectedRestaurantId] });
                          void queryClient.invalidateQueries({ queryKey: ["dashboard", selectedRestaurantId] });
                          void queryClient.invalidateQueries({ queryKey: ["dashboard-current-shift", selectedRestaurantId] });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.upcomingTitle")}</CardTitle>
            <CardDescription>{t("dashboard.upcomingDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {reservationsPanelQuery.isLoading ? <TableSkeleton /> : null}

            {reservationsPanelQuery.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{t("dashboard.errorLoadUpcoming")}</p>
                <Button variant="outline" size="sm" onClick={() => void reservationsPanelQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              </div>
            ) : null}

            {!reservationsPanelQuery.isLoading && !reservationsPanelQuery.isError && upcomingReservations.length === 0 ? (
              <EmptyState
                title={t("dashboard.noReservationsTitle")}
                description={t("dashboard.noUpcomingDescription")}
              />
            ) : null}

            {!reservationsPanelQuery.isError && upcomingReservations.length > 0 ? (
              <div className="space-y-2">
                {upcomingReservations.map((reservation) => (
                  <div key={reservation.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {reservation.time} - {reservation.guestName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("common.party")} {reservation.partySize}
                          {reservation.tableLabels?.length ? ` | ${reservation.tableLabels.join(", ")}` : ""}
                        </p>
                      </div>
                      <Badge className={statusBadgeClasses(reservation.status)}>
                        <span className="sr-only">{t("common.status")}: </span>
                        {reservation.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/reservations/${reservation.id}`)}>
                        {t("dashboard.viewReservation")}
                      </Button>
                      <ReservationActions
                        reservation={reservation}
                        onViewDetails={(reservationId) => navigate(`/reservations/${reservationId}`)}
                        onUpdated={() => {
                          void queryClient.invalidateQueries({ queryKey: ["admin-reservations", selectedRestaurantId] });
                          void queryClient.invalidateQueries({ queryKey: ["dashboard-reservations-panel", selectedRestaurantId] });
                          void queryClient.invalidateQueries({ queryKey: ["dashboard-live-service", selectedRestaurantId] });
                          void queryClient.invalidateQueries({ queryKey: ["dashboard", selectedRestaurantId] });
                          void queryClient.invalidateQueries({ queryKey: ["dashboard-current-shift", selectedRestaurantId] });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-2" onClick={() => setOpenWalkIn(true)}>
              <PlusCircle className="h-4 w-4" />
              {t("dashboard.newWalkIn")}
            </Button>
            <WalkInDialog open={openWalkIn} onOpenChange={setOpenWalkIn} />
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setOpenManualReservation(true)}>
              <PlusCircle className="h-4 w-4" />
              {t("dashboard.newReservation")}
            </Button>
            <ManualReservationDialog open={openManualReservation} onOpenChange={setOpenManualReservation} />

            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/timeline">{t("dashboard.viewTimeline")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
