import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { createRestaurant } from "@/api/restaurants";
import { billingApi } from "@/api/billing";
import type { OpeningHoursDay } from "@/api/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FormSkeleton, InlineLoader } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sanitizeSlug } from "@/features/auth/register-utils";
import {
  getOpeningHours,
  getRestaurantDetails,
  updateOpeningHours,
  updateRestaurant
} from "@/features/settings/api";
import { useAuth, useMaxRestaurants, useSelectedRestaurantId, useUserRole } from "@/hooks/use-auth";
import { ApiErrorCode } from "@/api/types";
import { useI18n } from "@/i18n";
import { showApiError, showSuccess } from "@/lib/toast";
import { SettingsSection } from "@/features/settings/components/SettingsSection";
import BillingSettingsPage from "@/features/billing/BillingSettingsPage";

export function SettingsPage() {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const auth = useAuth();
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const userRole = useUserRole();
  const { maxRestaurants, currentCount: restaurantCount } = useMaxRestaurants();
  const atQuota = userRole === "OWNER" && restaurantCount >= maxRestaurants;
  const [nameDraft, setNameDraft] = useState("");
  const [timezoneDraft, setTimezoneDraft] = useState("UTC");
  const [localeDraft, setLocaleDraft] = useState("en");
  const [bookingEnabledDraft, setBookingEnabledDraft] = useState(true);
  const [slotIntervalDraft, setSlotIntervalDraft] = useState("15");
  const [defaultDurationDraft, setDefaultDurationDraft] = useState("90");
  const [minNoticeDraft, setMinNoticeDraft] = useState("0");
  const [maxAdvanceDaysDraft, setMaxAdvanceDaysDraft] = useState("90");
  const [maxPartySizeDraft, setMaxPartySizeDraft] = useState("20");
  const [assignmentModeDraft] = useState<"AUTO">("AUTO");
  const [canEditSettings, setCanEditSettings] = useState(true);
  const [openingHoursDraft, setOpeningHoursDraft] = useState<OpeningHoursDay[]>([]);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantSlug, setNewRestaurantSlug] = useState("");
  const [newRestaurantTimezone, setNewRestaurantTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [newRestaurantLocale, setNewRestaurantLocale] = useState("en");
  const [isCreateAdditionalOpen, setIsCreateAdditionalOpen] = useState(false);

  const detailsQuery = useQuery({
    queryKey: ["restaurant-details", selectedRestaurantId],
    queryFn: getRestaurantDetails,
    enabled: Boolean(selectedRestaurantId)
  });

  const openingHoursQuery = useQuery({
    queryKey: ["opening-hours", selectedRestaurantId],
    queryFn: getOpeningHours,
    enabled: Boolean(selectedRestaurantId)
  });

  useEffect(() => {
    if (!detailsQuery.data) {
      return;
    }
    setNameDraft(detailsQuery.data.name);
    setTimezoneDraft(detailsQuery.data.timezone ?? "UTC");
    setLocaleDraft(detailsQuery.data.locale ?? "en");
    setBookingEnabledDraft(detailsQuery.data.bookingEnabled);
    setSlotIntervalDraft(String(detailsQuery.data.slotIntervalMinutes ?? 15));
    setDefaultDurationDraft(String(detailsQuery.data.defaultDurationMinutes ?? 90));
    setMinNoticeDraft(String(detailsQuery.data.minNoticeMinutes ?? 0));
    setMaxAdvanceDaysDraft(String(detailsQuery.data.maxAdvanceDays ?? 90));
    setMaxPartySizeDraft(String(detailsQuery.data.maxPartySize ?? 20));
  }, [detailsQuery.data]);

  useEffect(() => {
    if (!openingHoursQuery.data) {
      return;
    }
    const normalized = [...openingHoursQuery.data].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    setOpeningHoursDraft(normalized);
  }, [openingHoursQuery.data]);

  const bookingUrl = useMemo(() => {
    if (!detailsQuery.data) {
      return "";
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/r/${detailsQuery.data.slug}`;
  }, [detailsQuery.data]);

  const widgetUrl = useMemo(() => {
    if (!detailsQuery.data) {
      return "";
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/embed/${detailsQuery.data.slug}`;
  }, [detailsQuery.data]);

  const iframeSnippet = useMemo(() => {
    if (!widgetUrl) {
      return "";
    }
    return `<iframe src="${widgetUrl}" title="Book a table" width="100%" height="760" style="border:0;border-radius:12px;"></iframe>`;
  }, [widgetUrl]);

  const scriptEmbedSnippet = useMemo(() => {
    if (!detailsQuery.data) {
      return "";
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `<script src="${origin}/widget.js" data-mesaro-widget data-slug="${detailsQuery.data.slug}" data-height="760"></script>`;
  }, [detailsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateRestaurant({
        name: nameDraft.trim(),
        timezone: timezoneDraft.trim(),
        locale: localeDraft.trim(),
        bookingEnabled: bookingEnabledDraft,
        slotIntervalMinutes: Number(slotIntervalDraft),
        defaultDurationMinutes: Number(defaultDurationDraft),
        minNoticeMinutes: Number(minNoticeDraft),
        maxAdvanceDays: Number(maxAdvanceDaysDraft),
        maxPartySize: Number(maxPartySizeDraft),
        assignmentMode: "AUTO"
      }),
    onSuccess: () => {
      showSuccess(copy.settingsUpdated);
      void queryClient.invalidateQueries({ queryKey: ["restaurant-details", selectedRestaurantId] });
      void queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (error: unknown) => {
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;

      if (status === 404 || status === 405) {
        setCanEditSettings(false);
        showApiError(error);
        return;
      }

      showApiError(error);
    }
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: newRestaurantName.trim(),
        slug: sanitizeSlug(newRestaurantSlug),
        timezone: newRestaurantTimezone.trim() || "UTC",
        locale: newRestaurantLocale.trim() || "en",
        slotIntervalMinutes: 15,
        defaultDurationMinutes: 90,
        minNoticeMinutes: 0,
        maxAdvanceDays: 90,
        maxPartySize: 20,
        assignmentMode: "AUTO" as const
      };
      return createRestaurant(payload);
    },
    onSuccess: async () => {
      showSuccess(copy.restaurantCreated);
      setNewRestaurantName("");
      setNewRestaurantSlug("");
      setNewRestaurantLocale("en");
      // Refresh JWT so maxRestaurants / restaurant list reflect the new location.
      // Billing is owner-scoped: subscribed owners already paid via quantity;
      // trial owners subscribe from the Billing tab when ready (no second Checkout).
      await auth.silentRefresh();
      void queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (error: unknown) => {
      const code = typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
      if (code === ApiErrorCode.BILLING_LIMIT_EXCEEDED) {
        showApiError({
          ...error as object,
          message: copy.quotaExceeded
        });
        return;
      }
      showApiError(error);
    }
  });

  const increaseCapacityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRestaurantId) {
        throw new Error("No restaurant selected");
      }
      const status = await billingApi.getStatus(selectedRestaurantId);
      const hasLiveSubscription =
        status.stripeSubscriptionId != null &&
        (status.status === "ACTIVE" ||
          status.status === "PAST_DUE" ||
          status.status === "UNPAID" ||
          status.status === "PAUSED");
      if (!hasLiveSubscription) {
        const { url } = await billingApi.createCheckoutSession(selectedRestaurantId);
        window.location.href = url;
        return status;
      }
      return billingApi.updateQuantity(selectedRestaurantId, status.currentQuantity + 1);
    },
    onSuccess: async (result) => {
      if (!result || !("currentQuantity" in result)) {
        return;
      }
      showSuccess(copy.capacityIncreased);
      await auth.silentRefresh();
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      void queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (error) => showApiError(error)
  });

  const updateOpeningHoursMutation = useMutation({
    mutationFn: () =>
      updateOpeningHours(
        openingHoursDraft.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          open: day.open,
          openLocalTime: day.open ? day.openLocalTime : null,
          closeLocalTime: day.open ? day.closeLocalTime : null
        }))
      ),
    onSuccess: () => {
      showSuccess(copy.openingHoursUpdated);
      void queryClient.invalidateQueries({ queryKey: ["opening-hours", selectedRestaurantId] });
    },
    onError: (error) => showApiError(error)
  });

  const updateOpeningHoursDay = (
    dayOfWeek: number,
    patch: Partial<Pick<OpeningHoursDay, "open" | "openLocalTime" | "closeLocalTime">>
  ) => {
    setOpeningHoursDraft((current) =>
      current.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) {
          return day;
        }

        const next = { ...day, ...patch };
        if (!next.open) {
          next.openLocalTime = null;
          next.closeLocalTime = null;
        }
        return next;
      })
    );
  };

  const copyToClipboard = async (value: string, successText: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showSuccess(successText);
    } catch {
      showApiError({
        status: 0,
        code: "COPY_FAILED",
        message: "Clipboard copy failed"
      });
    }
  };

  const details = detailsQuery.data;
  const canCreateRestaurant = Boolean(newRestaurantName.trim() && sanitizeSlug(newRestaurantSlug)) && !atQuota;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.settings}</h1>
        <p className="text-sm text-muted-foreground">{copy.settingsSubtitle}</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{copy.general}</TabsTrigger>
          <TabsTrigger value="booking">{copy.bookingConfiguration}</TabsTrigger>
          <TabsTrigger value="locations">{copy.multiRestaurant}</TabsTrigger>
          {userRole === "OWNER" && (
            <TabsTrigger value="billing">{copy.billing}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="focus:ring-0 focus:outline-none">
          <ErrorBoundary level="section">
          <SettingsSection
            title={copy.restaurantProfile}
            description={copy.coreIdentity}
          >
            {detailsQuery.isLoading ? <FormSkeleton fields={4} /> : null}

            {detailsQuery.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{copy.unableLoadSettings}</p>
                <Button variant="outline" size="sm" onClick={() => void detailsQuery.refetch()}>
                  {copy.retry}
                </Button>
              </div>
            ) : null}

            {details ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">{copy.restaurantName}</label>
                  {canEditSettings ? (
                    <input
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  ) : (
                    <>
                      <p className="text-sm">{details.name}</p>
                      <p className="text-xs text-muted-foreground">{copy.contactSupportToChange}</p>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">{copy.slug}</label>
                  <p className="text-sm">{details.slug}</p>
                  <p className="text-xs text-muted-foreground">{copy.bookingPage}: {bookingUrl}</p>
                  <p className="text-xs text-muted-foreground">{copy.widgetUrl}: {widgetUrl}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => void copyToClipboard(bookingUrl, copy.bookingLinkCopied)}>
                      {copy.copyBookingLink}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void copyToClipboard(widgetUrl, copy.widgetUrlCopied)}>
                      {copy.copyWidgetUrl}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void copyToClipboard(iframeSnippet, copy.widgetIframeCopied)}>
                      {copy.copyIframeWidget}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void copyToClipboard(scriptEmbedSnippet, copy.widgetScriptCopied)}>
                      {copy.copyScriptEmbed}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">{copy.timezone}</label>
                  <input
                    value={timezoneDraft}
                    onChange={(event) => setTimezoneDraft(event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    disabled={!canEditSettings}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">{copy.languageLocale}</label>
                  <select
                    value={localeDraft}
                    onChange={(event) => setLocaleDraft(event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    disabled={!canEditSettings}
                  >
                    <option value="en">English (en)</option>
                    <option value="en-US">English (en-US)</option>
                    <option value="nl">Nederlands (nl)</option>
                    <option value="nl-NL">Nederlands (nl-NL)</option>
                    <option value="fr">Francais (fr)</option>
                    <option value="fr-FR">Francais (fr-FR)</option>
                    <option value="es">Espanol (es)</option>
                    <option value="es-ES">Espanol (es-ES)</option>
                  </select>
                </div>
              </div>
            ) : null}
            {!detailsQuery.isLoading && !detailsQuery.isError && !details ? (
              <EmptyState title={copy.noSettingsFound} description={copy.settingsUnavailable} />
            ) : null}
          </SettingsSection>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="booking" className="focus:ring-0 focus:outline-none">
          <ErrorBoundary level="section">
          <div className="space-y-4 md:space-y-6">
          <SettingsSection
            title={copy.bookingRules}
            description={copy.bookingRulesDescription}
          >
            {details ? (
              <div className="space-y-4">
                <div className="rounded-md border p-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={bookingEnabledDraft}
                      onChange={(event) => setBookingEnabledDraft(event.target.checked)}
                      disabled={!canEditSettings}
                    />
                    {copy.bookingEnabled}
                  </label>
                  {!bookingEnabledDraft ? (
                    <p className="mt-2 text-sm text-amber-700">
                      {copy.bookingDisabledWarning}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{copy.assignmentMode}</label>
                  <label className="flex items-start gap-2 rounded-md border p-3">
                    <input
                      type="radio"
                      name="assignmentMode"
                      checked={assignmentModeDraft === "AUTO"}
                      readOnly
                      disabled
                    />
                    <span>
                      <span className="block text-sm font-medium">{copy.auto}</span>
                      <span className="block text-xs text-muted-foreground">
                        {copy.systemAssignsBestFit}
                      </span>
                    </span>
                  </label>
                  <p className="text-xs text-muted-foreground">{copy.autoOnlyAssignmentMode}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{copy.slotInterval}</label>
                    <select
                      value={slotIntervalDraft}
                      onChange={(event) => setSlotIntervalDraft(event.target.value)}
                      disabled={!canEditSettings}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="20">20 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{copy.defaultReservationDuration}</label>
                    <select
                      value={defaultDurationDraft}
                      onChange={(event) => setDefaultDurationDraft(event.target.value)}
                      disabled={!canEditSettings}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                      <option value="120">120 minutes</option>
                      <option value="150">150 minutes</option>
                      <option value="180">180 minutes</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{copy.minimumNotice}</label>
                    <select
                      value={minNoticeDraft}
                      onChange={(event) => setMinNoticeDraft(event.target.value)}
                      disabled={!canEditSettings}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="0">No minimum</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                      <option value="180">3 hours</option>
                      <option value="240">4 hours</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{copy.maxDaysInAdvance}</label>
                    <select
                      value={maxAdvanceDaysDraft}
                      onChange={(event) => setMaxAdvanceDaysDraft(event.target.value)}
                      disabled={!canEditSettings}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                      <option value="90">90 days</option>
                      <option value="120">120 days</option>
                      <option value="180">180 days</option>
                      <option value="365">365 days</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{copy.maxPartySize}</label>
                    <select
                      value={maxPartySizeDraft}
                      onChange={(event) => setMaxPartySizeDraft(event.target.value)}
                      disabled={!canEditSettings}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="4">4</option>
                      <option value="6">6</option>
                      <option value="8">8</option>
                      <option value="10">10</option>
                      <option value="12">12</option>
                      <option value="16">16</option>
                      <option value="20">20</option>
                      <option value="30">30</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => updateMutation.mutate()}
                    disabled={!canEditSettings || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <InlineLoader /> : null}
                    {copy.saveChanges}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {copy.changesApplyImmediately}
                </p>
              </div>
            ) : null}
          </SettingsSection>

          <SettingsSection
            title={copy.openingHours}
            description={copy.openingHoursDescription}
          >
            {openingHoursQuery.isLoading ? <FormSkeleton fields={7} /> : null}
            {openingHoursQuery.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{copy.unableLoadOpeningHours}</p>
                <Button variant="outline" size="sm" onClick={() => void openingHoursQuery.refetch()}>
                  {copy.retry}
                </Button>
              </div>
            ) : null}
            {!openingHoursQuery.isLoading && !openingHoursQuery.isError ? (
              <div className="space-y-3">
                {openingHoursDraft.map((day) => (
                  <div key={day.dayOfWeek} className="grid gap-3 rounded-md border p-3 md:grid-cols-[180px,110px,1fr,1fr] md:items-center">
                    <p className="text-sm font-medium">{day.dayName.charAt(0) + day.dayName.slice(1).toLowerCase()}</p>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={day.open}
                        onChange={(event) => updateOpeningHoursDay(day.dayOfWeek, { open: event.target.checked })}
                        disabled={!canEditSettings || updateOpeningHoursMutation.isPending}
                      />
                      {copy.open}
                    </label>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{copy.openTime}</label>
                      <input
                        type="time"
                        value={day.openLocalTime ?? ""}
                        onChange={(event) => updateOpeningHoursDay(day.dayOfWeek, { openLocalTime: event.target.value || null })}
                        disabled={!day.open || !canEditSettings || updateOpeningHoursMutation.isPending}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{copy.closeTime}</label>
                      <input
                        type="time"
                        value={day.closeLocalTime ?? ""}
                        onChange={(event) => updateOpeningHoursDay(day.dayOfWeek, { closeLocalTime: event.target.value || null })}
                        disabled={!day.open || !canEditSettings || updateOpeningHoursMutation.isPending}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button
                    onClick={() => updateOpeningHoursMutation.mutate()}
                    disabled={!canEditSettings || updateOpeningHoursMutation.isPending || openingHoursDraft.length !== 7}
                  >
                    {updateOpeningHoursMutation.isPending ? <InlineLoader /> : null}
                    {copy.saveOpeningHours}
                  </Button>
                </div>
              </div>
            ) : null}
          </SettingsSection>
          </div>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="locations" className="focus:ring-0 focus:outline-none">
          <ErrorBoundary level="section">
            <div className="space-y-4 md:space-y-6">
            <SettingsSection
              title={copy.createAdditionalRestaurants}
              description={`${copy.useWhenPlanIncludesMultiple} ${userRole === "OWNER" ? `(${restaurantCount}/${maxRestaurants})` : ""}`}
              actions={(
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1"
                  onClick={() => setIsCreateAdditionalOpen((current) => !current)}
                  aria-expanded={isCreateAdditionalOpen}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCreateAdditionalOpen ? "rotate-180" : ""}`} />
                  {isCreateAdditionalOpen ? copy.collapse : copy.expand}
                </Button>
              )}
            >
              {atQuota && (
                <div className="space-y-3">
                  <p className="text-sm text-amber-700">{copy.quotaExceeded}</p>
                  {userRole === "OWNER" && selectedRestaurantId ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={increaseCapacityMutation.isPending}
                      onClick={() => increaseCapacityMutation.mutate()}
                    >
                      {increaseCapacityMutation.isPending ? <InlineLoader /> : null}
                      {copy.increaseCapacity}
                    </Button>
                  ) : null}
                </div>
              )}
              {!isCreateAdditionalOpen ? (
                <p className="text-sm text-muted-foreground">{copy.expandToCreateLocation}</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">{copy.restaurantName}</label>
                      <input
                        value={newRestaurantName}
                        onChange={(event) => setNewRestaurantName(event.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        placeholder="Downtown Bistro"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">{copy.slug}</label>
                      <input
                        value={newRestaurantSlug}
                        onChange={(event) => setNewRestaurantSlug(sanitizeSlug(event.target.value))}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        placeholder="downtown-bistro"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">{copy.timezone}</label>
                      <input
                        value={newRestaurantTimezone}
                        onChange={(event) => setNewRestaurantTimezone(event.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        placeholder="Europe/Brussels"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">{copy.localeLabel}</label>
                      <select
                        value={newRestaurantLocale}
                        onChange={(event) => setNewRestaurantLocale(event.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="en">English (en)</option>
                        <option value="en-US">English (en-US)</option>
                        <option value="nl">Nederlands (nl)</option>
                        <option value="nl-NL">Nederlands (nl-NL)</option>
                        <option value="fr">Francais (fr)</option>
                        <option value="fr-FR">Francais (fr-FR)</option>
                        <option value="es">Espanol (es)</option>
                        <option value="es-ES">Espanol (es-ES)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Button onClick={() => createRestaurantMutation.mutate()} disabled={!canCreateRestaurant || createRestaurantMutation.isPending}>
                      {createRestaurantMutation.isPending ? <InlineLoader /> : null}
                      {copy.createRestaurant}
                    </Button>
                  </div>
                </div>
              )}
            </SettingsSection>
            </div>
          </ErrorBoundary>
        </TabsContent>

        {userRole === "OWNER" && (
          <TabsContent value="billing" className="focus:ring-0 focus:outline-none">
            <ErrorBoundary level="section">
              <BillingSettingsPage />
            </ErrorBoundary>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

const COPY = {
  en: {
    settingsUpdated: "Settings updated",
    restaurantCreated: "Restaurant created",
    openingHoursUpdated: "Opening hours updated",
    settings: "Settings",
    settingsSubtitle: "Restaurant configuration and booking behavior.",
    general: "General",
    bookingConfiguration: "Booking Configuration",
    multiRestaurant: "Multi-Restaurant",
    restaurantProfile: "Restaurant Profile",
    coreIdentity: "Core identity and booking link details.",
    unableLoadSettings: "Unable to load settings.",
    retry: "Retry",
    restaurantName: "Restaurant Name",
    contactSupportToChange: "Contact support to change",
    slug: "Slug",
    bookingPage: "Booking page",
    widgetUrl: "Widget URL",
    bookingLinkCopied: "Booking link copied",
    copyBookingLink: "Copy booking link",
    widgetUrlCopied: "Widget URL copied",
    copyWidgetUrl: "Copy widget URL",
    widgetIframeCopied: "Widget iframe code copied",
    copyIframeWidget: "Copy iframe widget",
    widgetScriptCopied: "Widget script code copied",
    copyScriptEmbed: "Copy script embed",
    timezone: "Timezone",
    languageLocale: "Language locale",
    noSettingsFound: "No settings found",
    settingsUnavailable: "Restaurant settings are currently unavailable.",
    bookingRules: "Booking Rules",
    bookingRulesDescription: "Control booking behavior, slot cadence, and default reservation duration.",
    bookingEnabled: "Booking enabled",
    bookingDisabledWarning: "Booking is currently disabled. Guests cannot create new reservations.",
    assignmentMode: "Assignment mode",
    auto: "Auto",
    systemAssignsBestFit: "System automatically assigns the best-fit table",
    autoOnlyAssignmentMode: "Manual assignment is disabled. New reservations are always auto-assigned.",
    manual: "Manual",
    staffAssignsManually: "Staff manually assigns tables for each reservation",
    slotInterval: "Slot interval",
    defaultReservationDuration: "Default reservation duration",
    minimumNotice: "Minimum notice",
    maxDaysInAdvance: "Max days in advance",
    maxPartySize: "Max party size",
    saveChanges: "Save Changes",
    changesApplyImmediately: "Changes apply to your selected restaurant immediately after save.",
    openingHours: "Opening Hours",
    openingHoursDescription: "Weekly opening schedule used by availability and guest booking.",
    unableLoadOpeningHours: "Unable to load opening hours.",
    open: "Open",
    openTime: "Open time",
    closeTime: "Close time",
    saveOpeningHours: "Save Opening Hours",
    createAdditionalRestaurants: "Create Additional Restaurants",
    useWhenPlanIncludesMultiple: "Use this to create and manage multiple restaurant locations.",
    expand: "Expand",
    collapse: "Collapse",
    expandToCreateLocation: "Expand this section to create an additional location.",
    localeLabel: "Locale",
    billing: "Billing",
    createRestaurant: "Create restaurant",
    increaseCapacity: "Add restaurant seat (+€49.99/mo)",
    capacityIncreased: "Restaurant capacity increased. You can create another location now.",
    quotaExceeded: "You have reached your restaurant limit. Add a seat to your subscription (Upgrade +1 on Billing, or use the button below), then create the new location."
  },
  nl: {
    settingsUpdated: "Instellingen bijgewerkt",
    restaurantCreated: "Restaurant aangemaakt",
    openingHoursUpdated: "Openingstijden bijgewerkt",
    settings: "Instellingen",
    settingsSubtitle: "Restaurantconfiguratie en boekingsgedrag.",
    general: "Algemeen",
    bookingConfiguration: "Boekingsconfiguratie",
    multiRestaurant: "Multi-restaurant",
    restaurantProfile: "Restaurantprofiel",
    coreIdentity: "Kernidentiteit en details van de boekingslink.",
    unableLoadSettings: "Kan instellingen niet laden.",
    retry: "Opnieuw",
    restaurantName: "Restaurantnaam",
    contactSupportToChange: "Neem contact op met support om te wijzigen",
    slug: "Slug",
    bookingPage: "Boekingspagina",
    widgetUrl: "Widget-URL",
    bookingLinkCopied: "Boekingslink gekopieerd",
    copyBookingLink: "Kopieer boekingslink",
    widgetUrlCopied: "Widget-URL gekopieerd",
    copyWidgetUrl: "Kopieer widget-URL",
    widgetIframeCopied: "Widget iframe-code gekopieerd",
    copyIframeWidget: "Kopieer iframe widget",
    widgetScriptCopied: "Widget script-code gekopieerd",
    copyScriptEmbed: "Kopieer script-embed",
    timezone: "Tijdzone",
    languageLocale: "Taal-locale",
    noSettingsFound: "Geen instellingen gevonden",
    settingsUnavailable: "Restaurantinstellingen zijn momenteel niet beschikbaar.",
    bookingRules: "Boekingsregels",
    bookingRulesDescription: "Beheer boekingsgedrag, slotfrequentie en standaard reserveringsduur.",
    bookingEnabled: "Boekingen ingeschakeld",
    bookingDisabledWarning: "Boeken is momenteel uitgeschakeld. Gasten kunnen geen nieuwe reserveringen maken.",
    assignmentMode: "Toewijzingsmodus",
    auto: "Automatisch",
    systemAssignsBestFit: "Systeem wijst automatisch de best passende tafel toe",
    autoOnlyAssignmentMode: "Handmatige toewijzing is uitgeschakeld. Nieuwe reserveringen worden altijd automatisch toegewezen.",
    manual: "Handmatig",
    staffAssignsManually: "Personeel wijst tafels handmatig toe per reservering",
    slotInterval: "Slotinterval",
    defaultReservationDuration: "Standaard reserveringsduur",
    minimumNotice: "Minimale kennisgeving",
    maxDaysInAdvance: "Max dagen vooruit",
    maxPartySize: "Max groepsgrootte",
    saveChanges: "Wijzigingen opslaan",
    changesApplyImmediately: "Wijzigingen gelden direct voor het geselecteerde restaurant na opslaan.",
    openingHours: "Openingstijden",
    openingHoursDescription: "Wekelijks openingsschema gebruikt voor beschikbaarheid en gastboekingen.",
    unableLoadOpeningHours: "Kan openingstijden niet laden.",
    open: "Open",
    openTime: "Openingstijd",
    closeTime: "Sluitingstijd",
    saveOpeningHours: "Openingstijden opslaan",
    createAdditionalRestaurants: "Extra restaurants aanmaken",
    useWhenPlanIncludesMultiple: "Gebruik dit om meerdere restaurantlocaties aan te maken en te beheren.",
    expand: "Uitklappen",
    collapse: "Inklappen",
    expandToCreateLocation: "Klap deze sectie uit om een extra locatie aan te maken.",
    localeLabel: "Locale",
    billing: "Facturatie",
    createRestaurant: "Restaurant aanmaken",
    increaseCapacity: "Restaurantstoel toevoegen (+€49,99/maand)",
    capacityIncreased: "Restaurantcapaciteit verhoogd. U kunt nu een nieuwe locatie aanmaken.",
    quotaExceeded: "U heeft uw restaurantlimiet bereikt. Verhoog eerst de capaciteit van uw abonnement (+1), maak daarna de nieuwe locatie aan."
  },
  fr: {
    settingsUpdated: "Parametres mis a jour",
    restaurantCreated: "Restaurant cree",
    openingHoursUpdated: "Horaires d'ouverture mis a jour",
    settings: "Parametres",
    settingsSubtitle: "Configuration du restaurant et comportement de reservation.",
    general: "General",
    bookingConfiguration: "Configuration des reservations",
    multiRestaurant: "Multi-restaurant",
    restaurantProfile: "Profil du restaurant",
    coreIdentity: "Identite principale et details du lien de reservation.",
    unableLoadSettings: "Impossible de charger les parametres.",
    retry: "Reessayer",
    restaurantName: "Nom du restaurant",
    contactSupportToChange: "Contactez le support pour modifier",
    slug: "Slug",
    bookingPage: "Page de reservation",
    widgetUrl: "URL du widget",
    bookingLinkCopied: "Lien de reservation copie",
    copyBookingLink: "Copier le lien de reservation",
    widgetUrlCopied: "URL du widget copiee",
    copyWidgetUrl: "Copier l'URL du widget",
    widgetIframeCopied: "Code iframe du widget copie",
    copyIframeWidget: "Copier l'iframe widget",
    widgetScriptCopied: "Code script du widget copie",
    copyScriptEmbed: "Copier le script embed",
    timezone: "Fuseau horaire",
    languageLocale: "Locale de langue",
    noSettingsFound: "Aucun parametre trouve",
    settingsUnavailable: "Les parametres du restaurant sont indisponibles actuellement.",
    bookingRules: "Regles de reservation",
    bookingRulesDescription: "Controlez le comportement de reservation, la cadence des slots et la duree par defaut.",
    bookingEnabled: "Reservation activee",
    bookingDisabledWarning: "La reservation est desactivee. Les clients ne peuvent pas creer de nouvelles reservations.",
    assignmentMode: "Mode d'affectation",
    auto: "Auto",
    systemAssignsBestFit: "Le systeme attribue automatiquement la meilleure table",
    autoOnlyAssignmentMode: "L'affectation manuelle est desactivee. Les nouvelles reservations sont toujours attribuees automatiquement.",
    manual: "Manuel",
    staffAssignsManually: "Le personnel attribue les tables manuellement pour chaque reservation",
    slotInterval: "Intervalle des slots",
    defaultReservationDuration: "Duree par defaut de reservation",
    minimumNotice: "Preavis minimum",
    maxDaysInAdvance: "Nombre max de jours a l'avance",
    maxPartySize: "Taille max du groupe",
    saveChanges: "Enregistrer les modifications",
    changesApplyImmediately: "Les changements s'appliquent immediatement apres sauvegarde.",
    openingHours: "Horaires d'ouverture",
    openingHoursDescription: "Planning hebdomadaire utilise pour disponibilite et reservation client.",
    unableLoadOpeningHours: "Impossible de charger les horaires.",
    open: "Ouvert",
    openTime: "Heure d'ouverture",
    closeTime: "Heure de fermeture",
    saveOpeningHours: "Enregistrer les horaires",
    createAdditionalRestaurants: "Creer des restaurants supplementaires",
    useWhenPlanIncludesMultiple: "Utilisez ceci pour creer et gerer plusieurs sites de restaurant.",
    expand: "Developper",
    collapse: "Reduire",
    expandToCreateLocation: "Developpez cette section pour creer un site supplementaire.",
    localeLabel: "Locale",
    billing: "Facturation",
    createRestaurant: "Creer un restaurant",
    increaseCapacity: "Ajouter un siege restaurant (+49,99 €/mois)",
    capacityIncreased: "Capacite restaurants augmentee. Vous pouvez creer un nouvel etablissement.",
    quotaExceeded: "Vous avez atteint votre limite de restaurants. Augmentez d'abord la capacite de l'abonnement (+1), puis creez le nouvel etablissement."
  },
  es: {
    settingsUpdated: "Configuracion actualizada",
    restaurantCreated: "Restaurante creado",
    openingHoursUpdated: "Horario de apertura actualizado",
    settings: "Configuracion",
    settingsSubtitle: "Configuracion del restaurante y comportamiento de reservas.",
    general: "General",
    bookingConfiguration: "Configuracion de reservas",
    multiRestaurant: "Multi-restaurante",
    restaurantProfile: "Perfil del restaurante",
    coreIdentity: "Identidad principal y detalles del enlace de reservas.",
    unableLoadSettings: "No se puede cargar la configuracion.",
    retry: "Reintentar",
    restaurantName: "Nombre del restaurante",
    contactSupportToChange: "Contacta a soporte para cambiar",
    slug: "Slug",
    bookingPage: "Pagina de reservas",
    widgetUrl: "URL del widget",
    bookingLinkCopied: "Enlace de reservas copiado",
    copyBookingLink: "Copiar enlace de reservas",
    widgetUrlCopied: "URL del widget copiada",
    copyWidgetUrl: "Copiar URL del widget",
    widgetIframeCopied: "Codigo iframe del widget copiado",
    copyIframeWidget: "Copiar iframe del widget",
    widgetScriptCopied: "Codigo script del widget copiado",
    copyScriptEmbed: "Copiar script embed",
    timezone: "Zona horaria",
    languageLocale: "Locale de idioma",
    noSettingsFound: "No se encontro configuracion",
    settingsUnavailable: "La configuracion del restaurante no esta disponible actualmente.",
    bookingRules: "Reglas de reserva",
    bookingRulesDescription: "Controla el comportamiento de reservas, cadencia de slots y duracion por defecto.",
    bookingEnabled: "Reservas habilitadas",
    bookingDisabledWarning: "Las reservas estan deshabilitadas. Los clientes no pueden crear nuevas reservas.",
    assignmentMode: "Modo de asignacion",
    auto: "Automatico",
    systemAssignsBestFit: "El sistema asigna automaticamente la mejor mesa",
    autoOnlyAssignmentMode: "La asignacion manual esta deshabilitada. Las nuevas reservas siempre se asignan automaticamente.",
    manual: "Manual",
    staffAssignsManually: "El personal asigna mesas manualmente para cada reserva",
    slotInterval: "Intervalo de slots",
    defaultReservationDuration: "Duracion predeterminada de reserva",
    minimumNotice: "Aviso minimo",
    maxDaysInAdvance: "Maximo de dias por adelantado",
    maxPartySize: "Tamano maximo del grupo",
    saveChanges: "Guardar cambios",
    changesApplyImmediately: "Los cambios se aplican inmediatamente al restaurante seleccionado.",
    openingHours: "Horario de apertura",
    openingHoursDescription: "Horario semanal usado por disponibilidad y reservas de clientes.",
    unableLoadOpeningHours: "No se puede cargar el horario de apertura.",
    open: "Abierto",
    openTime: "Hora de apertura",
    closeTime: "Hora de cierre",
    saveOpeningHours: "Guardar horario de apertura",
    createAdditionalRestaurants: "Crear restaurantes adicionales",
    useWhenPlanIncludesMultiple: "Usa esto para crear y gestionar varias ubicaciones de restaurante.",
    expand: "Expandir",
    collapse: "Contraer",
    expandToCreateLocation: "Expande esta seccion para crear una ubicacion adicional.",
    localeLabel: "Locale",
    billing: "Facturacion",
    createRestaurant: "Crear restaurante",
    increaseCapacity: "Anadir plaza de restaurante (+49,99 €/mes)",
    capacityIncreased: "Capacidad de restaurantes aumentada. Ya puedes crear otra ubicacion.",
    quotaExceeded: "Has alcanzado tu limite de restaurantes. Aumenta primero la capacidad de la suscripcion (+1) y luego crea la nueva ubicacion."
  }
} as const;
