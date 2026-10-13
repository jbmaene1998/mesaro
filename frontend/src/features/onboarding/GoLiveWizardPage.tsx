import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { RestaurantContext } from "@/stores/restaurant-context";
import { useOnboardingStatus, type WizardStepId } from "@/features/onboarding/hooks/useOnboardingStatus";
import { markStaffFirstRunPending } from "@/features/onboarding/staffFirstRun";
import { getWizardCopy } from "@/features/onboarding/wizardCopy";
import { RestaurantStep } from "@/features/onboarding/steps/RestaurantStep";
import { TablesStep } from "@/features/onboarding/steps/TablesStep";
import { ShiftsStep } from "@/features/onboarding/steps/ShiftsStep";
import { RulesStep } from "@/features/onboarding/steps/RulesStep";
import { BookingStep } from "@/features/onboarding/steps/BookingStep";
import { ShareStep } from "@/features/onboarding/steps/ShareStep";
import { StaffStep } from "@/features/onboarding/steps/StaffStep";
import { getTables } from "@/features/tables/api";
import { getShifts } from "@/features/shifts/api";
import { getRestaurantDetails } from "@/features/settings/api";
import { useSelectedRestaurantId } from "@/hooks/use-auth";

const STEP_ORDER: WizardStepId[] = [
  "restaurant",
  "tables",
  "shifts",
  "rules",
  "booking",
  "share",
  "staff"
];

const TRIAL_STARTED_FLAG_PREFIX = "mesaro.trial.started.";

function resolveInitialStep(
  searchStep: string | null,
  hasRestaurant: boolean,
  nextStepId: WizardStepId | null
): WizardStepId {
  if (searchStep && STEP_ORDER.includes(searchStep as WizardStepId)) {
    const requested = searchStep as WizardStepId;
    if (requested !== "restaurant" && !hasRestaurant) {
      return "restaurant";
    }
    return requested;
  }
  if (!hasRestaurant) {
    return "restaurant";
  }
  return nextStepId ?? "tables";
}

export function GoLiveWizardPage() {
  const { locale } = useI18n();
  const copy = getWizardCopy(locale);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, restaurants, silentRefresh } = useAuth();
  const restaurantContext = useContext(RestaurantContext);
  const selectedRestaurantId = useSelectedRestaurantId();
  const onboarding = useOnboardingStatus(isAuthenticated && restaurants.length > 0);

  const hasRestaurant = restaurants.length > 0;
  const [stepId, setStepId] = useState<WizardStepId>(() =>
    resolveInitialStep(searchParams.get("step"), hasRestaurant, null)
  );

  useEffect(() => {
    if (onboarding.isLoading && hasRestaurant) {
      return;
    }
    const nextId = onboarding.nextStep?.id ?? null;
    setStepId((current) => {
      const fromQuery = searchParams.get("step");
      if (fromQuery && STEP_ORDER.includes(fromQuery as WizardStepId)) {
        const requested = fromQuery as WizardStepId;
        if (requested !== "restaurant" && !hasRestaurant) {
          return "restaurant";
        }
        return requested;
      }
      if (!hasRestaurant) {
        return "restaurant";
      }
      if (current === "restaurant" && hasRestaurant) {
        return nextId ?? "tables";
      }
      return current;
    });
  }, [hasRestaurant, onboarding.isLoading, onboarding.nextStep?.id, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (params.get("step") !== stepId) {
      params.set("step", stepId);
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams, stepId]);

  const detailsQuery = useQuery({
    queryKey: ["restaurant-details", selectedRestaurantId],
    queryFn: getRestaurantDetails,
    enabled: Boolean(selectedRestaurantId)
  });
  const tablesQuery = useQuery({
    queryKey: ["tables", selectedRestaurantId],
    queryFn: getTables,
    enabled: Boolean(selectedRestaurantId)
  });
  const shiftsQuery = useQuery({
    queryKey: ["shifts", selectedRestaurantId],
    queryFn: getShifts,
    enabled: Boolean(selectedRestaurantId)
  });

  const stepIndex = STEP_ORDER.indexOf(stepId);
  const progressLabel = copy.stepOf
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(STEP_ORDER.length));

  const stepTitle = useMemo(() => {
    const titles: Record<WizardStepId, string> = {
      restaurant: copy.restaurantTitle,
      tables: copy.tablesTitle,
      shifts: copy.shiftsTitle,
      rules: copy.rulesTitle,
      booking: copy.bookingTitle,
      share: copy.shareTitle,
      staff: copy.staffTitle
    };
    return titles[stepId];
  }, [copy, stepId]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const goTo = (id: WizardStepId) => setStepId(id);
  const finishToDashboard = () => {
    markStaffFirstRunPending();
    navigate("/dashboard?live=1", { replace: true });
  };
  const goNext = () => {
    const next = STEP_ORDER[stepIndex + 1];
    if (next) {
      goTo(next);
      return;
    }
    finishToDashboard();
  };
  const goBack = () => {
    if (stepIndex <= 0) {
      return;
    }
    goTo(STEP_ORDER[stepIndex - 1]);
  };

  const refreshAfterCreate = async (restaurantId: string) => {
    sessionStorage.setItem(`${TRIAL_STARTED_FLAG_PREFIX}${restaurantId}`, "1");
    await silentRefresh();
    await restaurantContext?.refreshContext();
  };

  const refetchSetup = async () => {
    await Promise.all([
      detailsQuery.refetch(),
      tablesQuery.refetch(),
      shiftsQuery.refetch(),
      onboarding.refetchAll()
    ]);
  };

  const canEnableBooking =
    (tablesQuery.data?.length ?? 0) >= 1 &&
    (shiftsQuery.data ?? []).some((shift) => shift.status === "ACTIVE");

  if (hasRestaurant && onboarding.isLoading && !detailsQuery.data) {
    return <PageLoader className="min-h-screen" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{progressLabel}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100)}%` }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{stepTitle}</CardTitle>
          <CardDescription>{progressLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stepId === "restaurant" ? (
            <RestaurantStep
              copy={copy}
              hasRestaurant={hasRestaurant}
              restaurantName={detailsQuery.data?.name ?? restaurantContext?.currentRestaurant?.name}
              restaurantSlug={detailsQuery.data?.slug ?? restaurantContext?.currentRestaurant?.slug}
              onCreated={refreshAfterCreate}
              onContinue={goNext}
            />
          ) : null}

          {stepId === "tables" && selectedRestaurantId ? (
            <TablesStep
              copy={copy}
              existingTables={tablesQuery.data ?? []}
              onSaved={refetchSetup}
              onContinue={goNext}
            />
          ) : null}

          {stepId === "shifts" && selectedRestaurantId ? (
            <ShiftsStep
              copy={copy}
              existingShifts={shiftsQuery.data ?? []}
              restaurantTimezone={detailsQuery.data?.timezone}
              onSaved={refetchSetup}
              onContinue={goNext}
            />
          ) : null}

          {stepId === "rules" && selectedRestaurantId ? (
            <RulesStep
              copy={copy}
              restaurantId={selectedRestaurantId}
              restaurant={detailsQuery.data}
              onSaved={refetchSetup}
              onContinue={goNext}
            />
          ) : null}

          {stepId === "booking" && selectedRestaurantId ? (
            <BookingStep
              copy={copy}
              bookingEnabled={detailsQuery.data?.bookingEnabled === true}
              canEnable={canEnableBooking}
              onSaved={refetchSetup}
              onContinue={goNext}
            />
          ) : null}

          {stepId === "share" && selectedRestaurantId && detailsQuery.data?.slug ? (
            <ShareStep
              copy={copy}
              restaurantId={selectedRestaurantId}
              slug={detailsQuery.data.slug}
              onContinue={goNext}
            />
          ) : null}

          {stepId === "staff" && selectedRestaurantId ? (
            <StaffStep
              copy={copy}
              onSaved={refetchSetup}
              onContinue={finishToDashboard}
              onSkip={finishToDashboard}
            />
          ) : null}

          {stepIndex > 0 ? (
            <div className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={goBack}>
                {copy.back}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
