import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { TimelineReservation, TimelineTable } from "@/features/timeline/api";
import { getTimeline } from "@/features/timeline/api";
import { TimelineControls } from "@/features/timeline/components/TimelineControls";
import { TimelineGrid } from "@/features/timeline/components/TimelineGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/loading";
import { useIsMobile } from "@/hooks/use-media-query";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";

function TimelineSkeleton() {
  return <CardSkeleton />;
}

function statusBadgeClasses(status: TimelineReservation["status"]) {
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  if (status === "SEATED") return "bg-green-100 text-green-800 hover:bg-green-100";
  if (status === "COMPLETED") return "bg-zinc-200 text-zinc-800 hover:bg-zinc-200";
  if (status === "NO_SHOW") return "bg-red-100 text-red-800 hover:bg-red-100";
  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function MobileTimelineList({
  tables,
  reservations
}: {
  tables: TimelineTable[];
  reservations: TimelineReservation[];
}) {
  const { t } = useI18n();
  const tableLabels = useMemo(() => new Set(tables.map((table) => table.label)), [tables]);
  const grouped = useMemo(
    () =>
      tables.map((table) => ({
        table,
        reservations: reservations
          .filter((reservation) => reservation.tableLabels.includes(table.label))
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
      })),
    [reservations, tables]
  );
  const unassignedReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => !reservation.tableLabels.some((label) => tableLabels.has(label)))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [reservations, tableLabels]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("timeline.mobileGrouped")}</p>
      {grouped.map(({ table, reservations: tableReservations }) => (
        <Card key={table.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {table.label} <span className="text-sm font-normal text-muted-foreground">({table.seats} {t("common.seats")})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tableReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("timeline.noReservationsShort")}</p>
            ) : (
              tableReservations.map((reservation) => (
                <Link
                  key={`${table.id}-${reservation.id}`}
                  to={`/reservations/${reservation.id}`}
                  className="block rounded-md border p-3 transition hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{reservation.guestName}</p>
                      <p className="text-xs text-muted-foreground">
                        {reservation.startTime} - {reservation.endTime} | {t("common.party")} {reservation.partySize}
                      </p>
                    </div>
                    <Badge className={statusBadgeClasses(reservation.status)}>
                      <span className="sr-only">{t("common.status")}: </span>
                      {reservation.status}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ))}
      {unassignedReservations.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("timeline.unassignedReservations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unassignedReservations.map((reservation) => (
              <Link
                key={`unassigned-${reservation.id}`}
                to={`/reservations/${reservation.id}`}
                className="block rounded-md border p-3 transition hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{reservation.guestName}</p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.startTime} - {reservation.endTime} | {t("common.party")} {reservation.partySize}
                    </p>
                  </div>
                  <Badge className={statusBadgeClasses(reservation.status)}>
                    <span className="sr-only">{t("common.status")}: </span>
                    {reservation.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function TimelinePage() {
  const { t } = useI18n();
  const selectedRestaurantId = useSelectedRestaurantId();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slotMinutesOverride, setSlotMinutesOverride] = useState<15 | 30 | 60 | null>(null);
  const [scrollToNowSignal, setScrollToNowSignal] = useState(0);
  const isMobile = useIsMobile();

  const timelineQuery = useQuery({
    queryKey: ["timeline", selectedRestaurantId, selectedDate],
    queryFn: () => getTimeline(selectedDate),
    enabled: Boolean(selectedRestaurantId),
    staleTime: 0,
    refetchInterval: 30_000
  });

  const slotMinutes = useMemo<15 | 30 | 60>(() => {
    if (slotMinutesOverride) {
      return slotMinutesOverride;
    }

    const apiSlot = timelineQuery.data?.slotDurationMinutes;
    if (apiSlot === 15 || apiSlot === 30 || apiSlot === 60) {
      return apiSlot;
    }

    return 30;
  }, [slotMinutesOverride, timelineQuery.data?.slotDurationMinutes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("timeline.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("timeline.subtitle")}</p>
      </div>

      <ErrorBoundary level="section">
        <h2 className="sr-only">{t("timeline.controlsTitle")}</h2>
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>{format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}</CardTitle>
            <TimelineControls
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              slotMinutes={slotMinutes}
              onSlotMinutesChange={setSlotMinutesOverride}
              onScrollToNow={() => setScrollToNowSignal((value) => value + 1)}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {timelineQuery.isLoading ? <TimelineSkeleton /> : null}

            {timelineQuery.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{t("timeline.errorLoad")}</p>
                <Button variant="outline" size="sm" onClick={() => void timelineQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              </div>
            ) : null}

            {!timelineQuery.isLoading && !timelineQuery.isError && (timelineQuery.data?.tables.length ?? 0) === 0 ? (
              <EmptyState title={t("timeline.noTablesTitle")} description={t("timeline.noTablesDescription")} />
            ) : null}

            {!timelineQuery.isLoading && !timelineQuery.isError && (timelineQuery.data?.tables.length ?? 0) > 0 ? (
              <>
                {(timelineQuery.data?.reservations.length ?? 0) === 0 ? (
                  <EmptyState title={t("timeline.noReservationsTitle")} description={t("timeline.noReservationsDescription")} />
                ) : null}
                {isMobile ? (
                  <div className="space-y-4">
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                      {t("timeline.mobileNotice")}{" "}
                      <Link to="/reservations" className="font-medium underline underline-offset-4">
                        {t("timeline.reservationsListLink")}
                      </Link>
                      {t("timeline.mobileNoticeSuffix")}
                    </div>
                    <MobileTimelineList
                      tables={timelineQuery.data?.tables ?? []}
                      reservations={timelineQuery.data?.reservations ?? []}
                    />
                  </div>
                ) : (
                  <TimelineGrid
                    date={selectedDate}
                    tables={timelineQuery.data?.tables ?? []}
                    reservations={timelineQuery.data?.reservations ?? []}
                    shifts={timelineQuery.data?.shifts ?? []}
                    slotMinutes={slotMinutes}
                    scrollToNowSignal={scrollToNowSignal}
                  />
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  );
}
