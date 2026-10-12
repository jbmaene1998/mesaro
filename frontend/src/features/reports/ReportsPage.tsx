import { useMutation, useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subDays } from "date-fns";
import { Clock, Download, Printer } from "lucide-react";
import { useContext, useMemo, useState } from "react";

import type { Reservation, ReservationStatus } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReservations } from "@/features/reservations/api";
import { defaultReportRange, exportReportCsv, getReportSummary } from "@/features/reports/api";
import type { ReportDailyRow } from "@/features/reports/api";
import { useI18n } from "@/i18n";
import { showApiError, showSuccess } from "@/lib/toast";
import { RestaurantContext } from "@/stores/restaurant-context";

const REPORT_PRINT_STYLES = `
  @media print {
    aside, header, nav { display: none !important; }
    main { padding: 0 !important; }
    .print\\:hidden { display: none !important; }
    .print\\:block { display: block !important; }
  }
`;

const STATUS_META: Record<ReservationStatus, { className: string }> = {
  CONFIRMED: { className: "bg-blue-100 text-blue-800 border-blue-200" },
  SEATED: { className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  COMPLETED: { className: "bg-gray-100 text-gray-600 border-gray-200" },
  NO_SHOW: { className: "bg-orange-100 text-orange-800 border-orange-200" },
  CANCELLED: { className: "bg-red-100 text-red-700 border-red-200" }
};

function formatStatusLabel(status: string, t: (key: string) => string): string {
  const key = `reservation.status.${status}`;
  const translated = t(key);
  if (translated !== key) {
    return translated;
  }

  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatGeneratedAt(value: string | null | undefined) {
  if (!value) {
    return format(new Date(), "yyyy-MM-dd HH:mm");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return format(new Date(), "yyyy-MM-dd HH:mm");
  }

  return format(parsed, "yyyy-MM-dd HH:mm");
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const meta = STATUS_META[status as ReservationStatus];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${meta?.className ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
    >
      {formatStatusLabel(status, t)}
    </span>
  );
}

function groupByShift(reservations: Reservation[]): [string, Reservation[]][] {
  const sorted = [...reservations].sort((a, b) => a.time.localeCompare(b.time));
  const map = new Map<string, Reservation[]>();

  for (const reservation of sorted) {
    const key = reservation.shiftName || "-";
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(reservation);
  }

  return [...map.entries()];
}

function TodayTimeline({ date, restaurantId }: { date: string; restaurantId: string | null }) {
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ["reservations", "timeline-today", restaurantId, date],
    queryFn: () => getReservations({ date }),
    enabled: Boolean(restaurantId),
    staleTime: 60_000
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-base">
          {t("reports.todayTimeline")} - {date}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!restaurantId ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("reports.selectRestaurant")}</p>
        ) : query.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{t("reports.errorLoadToday")}</p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : !query.data?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("reports.todayTimelineEmpty")}</p>
        ) : (
          <div className="space-y-5">
            {groupByShift(query.data).map(([shiftName, items]) => (
              <div key={shiftName}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{shiftName}</p>
                <div className="space-y-1.5">
                  {items.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 text-sm"
                    >
                      <span className="w-11 shrink-0 font-mono text-xs font-medium text-muted-foreground">
                        {reservation.time}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{reservation.guestName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Party of {reservation.partySize}
                          {reservation.tableLabels.length > 0 ? ` | ${reservation.tableLabels.join(", ")}` : ""}
                          {reservation.notes ? ` | ${reservation.notes}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={reservation.status} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function DailyTrendChart({ rows }: { rows: ReportDailyRow[] }) {
  const { t } = useI18n();

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("reports.noDailyData")}</p>;
  }

  const width = 920;
  const height = 320;
  const margin = { top: 18, right: 18, bottom: 42, left: 42 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(
    ...rows.flatMap((row) => [row.reservations, row.covers, row.noShows, row.cancellations]),
    1
  );

  const xFor = (index: number) => {
    if (rows.length <= 1) {
      return margin.left + plotWidth / 2;
    }
    return margin.left + (index / (rows.length - 1)) * plotWidth;
  };

  const yFor = (value: number) => margin.top + plotHeight - (value / maxValue) * plotHeight;

  const pointsFor = (values: number[]) => values.map((value, index) => ({ x: xFor(index), y: yFor(value) }));
  const buildSmoothPath = (values: number[]) => {
    const points = pointsFor(values);
    if (!points.length) {
      return "";
    }
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const cx = (current.x + next.x) / 2;
      path += ` C ${cx} ${current.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const buildAreaPath = (values: number[]) => {
    const smoothLine = buildSmoothPath(values);
    if (!smoothLine) {
      return "";
    }

    const firstX = xFor(0);
    const lastX = xFor(rows.length - 1);
    const baseY = margin.top + plotHeight;
    return `${smoothLine} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const shortDate = (value: string) => value.slice(5);

  const lines = [
    {
      key: "reservations",
      label: t("common.reservations"),
      color: "#2563eb",
      strokeWidth: 3,
      strokeDasharray: undefined,
      emphasis: true,
      values: rows.map((row) => row.reservations)
    },
    {
      key: "covers",
      label: t("common.covers"),
      color: "#059669",
      strokeWidth: 2.5,
      strokeDasharray: undefined,
      emphasis: true,
      values: rows.map((row) => row.covers)
    },
    {
      key: "noShows",
      label: t("dashboard.noShows"),
      color: "#ea580c",
      strokeWidth: 2,
      strokeDasharray: "6 4",
      emphasis: false,
      values: rows.map((row) => row.noShows)
    },
    {
      key: "cancellations",
      label: t("reports.cancellations"),
      color: "#dc2626",
      strokeWidth: 2,
      strokeDasharray: "5 5",
      emphasis: false,
      values: rows.map((row) => row.cancellations)
    }
  ];

  const xTickTarget = Math.min(6, rows.length);
  const xStep = Math.max(1, Math.floor((rows.length - 1) / Math.max(1, xTickTarget - 1)));
  const tickIndexes = Array.from({ length: rows.length }, (_, index) => index).filter(
    (index) => index === 0 || index === rows.length - 1 || index % xStep === 0
  );
  const yTicks = [0, Math.ceil(maxValue * 0.25), Math.ceil(maxValue * 0.5), Math.ceil(maxValue * 0.75), maxValue];
  const reservationsAreaPath = buildAreaPath(lines[0].values);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {lines.map((line) => (
          <div key={line.key} className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: line.color, opacity: line.emphasis ? 1 : 0.8 }}
            />
            <span className={line.emphasis ? "font-medium text-foreground" : ""}>{line.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-gradient-to-b from-slate-50/60 to-white p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t("reports.dailyTrend")}
          className="h-[300px] min-w-[760px] w-full"
        >
          <defs>
            <linearGradient id="trendReservationsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={`tick-${tick}`}>
                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={margin.left - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
                  {tick}
                </text>
              </g>
            );
          })}

          {reservationsAreaPath ? <path d={reservationsAreaPath} fill="url(#trendReservationsFill)" /> : null}

          {lines.map((line) => (
            <g key={line.key}>
              <path
                d={buildSmoothPath(line.values)}
                fill="none"
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={line.strokeDasharray}
                opacity={line.emphasis ? 1 : 0.9}
              />
              {line.values.map((value, index) => (
                <circle
                  key={`${line.key}-${rows[index]?.date}`}
                  cx={xFor(index)}
                  cy={yFor(value)}
                  r={line.emphasis ? 3 : 2.2}
                  fill={line.color}
                  opacity={line.emphasis ? 1 : 0.85}
                >
                  <title>{`${line.label}: ${value} (${rows[index]?.date})`}</title>
                </circle>
              ))}
            </g>
          ))}

          {tickIndexes.map((index) => (
            <text
              key={`x-${rows[index]?.date ?? index}`}
              x={xFor(index)}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-500 text-[10px]"
            >
              {shortDate(rows[index]?.date ?? "")}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { t } = useI18n();
  const restaurant = useContext(RestaurantContext);
  const restaurantId = restaurant?.currentRestaurant?.id ?? null;
  const today = format(new Date(), "yyyy-MM-dd");
  const defaults = defaultReportRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const hasInvalidRange = endDate < startDate;

  const quickRanges = useMemo(
    () => [
      {
        key: "7",
        label: t("reports.last7Days"),
        apply: () => {
          setEndDate(today);
          setStartDate(format(subDays(new Date(), 6), "yyyy-MM-dd"));
        }
      },
      {
        key: "30",
        label: t("reports.last30Days"),
        apply: () => {
          setEndDate(today);
          setStartDate(format(subDays(new Date(), 29), "yyyy-MM-dd"));
        }
      },
      {
        key: "90",
        label: t("reports.last90Days"),
        apply: () => {
          setEndDate(today);
          setStartDate(format(subDays(new Date(), 89), "yyyy-MM-dd"));
        }
      },
      {
        key: "mtd",
        label: t("reports.monthToDate"),
        apply: () => {
          setEndDate(today);
          setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
        }
      }
    ],
    [t, today]
  );

  const summaryQuery = useQuery({
    queryKey: ["reports-summary", restaurantId, startDate, endDate],
    queryFn: () => getReportSummary(startDate, endDate),
    enabled: Boolean(restaurantId) && !hasInvalidRange
  });

  const exportMutation = useMutation({
    mutationFn: () => exportReportCsv(startDate, endDate),
    onSuccess: ({ blob, fileName }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName ?? `report_${startDate}_${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess(t("reports.csvDownloaded"));
    },
    onError: (error) => showApiError(error)
  });

  const summary = summaryQuery.data;

  return (
    <>
      <style>{REPORT_PRINT_STYLES}</style>

      <div className="space-y-4 md:space-y-6">
        <div className="grid gap-4 rounded-lg border bg-card p-4 print:hidden lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[auto_11rem_auto_11rem_auto_auto] lg:items-end">
            <div className="space-y-1 sm:col-span-2 lg:col-span-6">
              <div className="flex flex-wrap gap-2">
                {quickRanges.map((range) => (
                  <Button key={range.key} variant="outline" size="sm" onClick={range.apply}>
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="reports-start">
                {t("reports.from")}
              </label>
              <input
                id="reports-start"
                type="date"
                value={startDate}
                max={today}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="reports-end">
                {t("reports.to")}
              </label>
              <input
                id="reports-end"
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>

            <Button
              variant="outline"
              className="gap-2 sm:col-span-1 lg:col-start-5"
              onClick={() => exportMutation.mutate()}
              disabled={hasInvalidRange || exportMutation.isPending || !restaurantId}
            >
              <Download className="h-4 w-4" />
              {exportMutation.isPending ? t("reports.exportingCsv") : t("reports.exportCsv")}
            </Button>

            <Button variant="outline" className="gap-2 sm:col-span-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t("reports.printReport")}
            </Button>
          </div>
        </div>

        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
          <p className="text-sm text-gray-500">
            {startDate} - {endDate} | {t("reports.generatedAt")} {formatGeneratedAt(summary?.generatedAt)}
          </p>
        </div>

        {!restaurantId && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">{t("reports.selectRestaurant")}</CardContent>
          </Card>
        )}

        {hasInvalidRange && (
          <Card>
            <CardContent className="pt-6 text-sm text-destructive">{t("reports.invalidRange")}</CardContent>
          </Card>
        )}

        <TodayTimeline date={today} restaurantId={restaurantId} />

        <ErrorBoundary level="section">
          {summaryQuery.isLoading && !hasInvalidRange && restaurantId && (
            <div className="space-y-4 md:space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[0, 1, 2, 3, 4].map((index) => (
                  <Card key={index}>
                    <CardContent className="space-y-2 pt-5">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-7 w-14" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-56 w-full rounded-lg" />
            </div>
          )}

          {summaryQuery.isError && (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm text-destructive">{t("reports.errorLoad")}</p>
                <Button variant="outline" size="sm" onClick={() => void summaryQuery.refetch()}>
                  {t("common.retry")}
                </Button>
              </CardContent>
            </Card>
          )}

          {!summaryQuery.isLoading && !summaryQuery.isError && !summary && !hasInvalidRange && restaurantId && (
            <EmptyState title={t("reports.noDataTitle")} description={t("reports.noDataDescription")} />
          )}

          {summary && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-base font-semibold text-muted-foreground">
                {t("reports.periodSummary")}: {summary.startDate} - {summary.endDate}
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <MetricCard label={t("common.reservations")} value={summary.totals.totalReservations} />
                <MetricCard label={t("common.covers")} value={summary.totals.totalCovers} />
                <MetricCard label={t("reports.avgParty")} value={summary.totals.averagePartySize.toFixed(1)} />
                <MetricCard label={t("reports.noShowPercent")} value={`${summary.totals.noShowRatePercent.toFixed(1)}%`} />
                <MetricCard
                  label={t("reports.cancellationPercent")}
                  value={`${summary.totals.cancellationRatePercent.toFixed(1)}%`}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("reports.statusBreakdown")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                      <div key={status} className="rounded-md border p-3">
                        <StatusBadge status={status} />
                        <p className="mt-2 text-2xl font-semibold">{count}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("reports.dailyTrend")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DailyTrendChart rows={summary.dailyBreakdown} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("reports.shiftPerformance")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.shiftBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("reports.noShiftData")}</p>
                  ) : (
                    <UiTable>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("reports.shift")}</TableHead>
                          <TableHead className="text-right">{t("common.reservations")}</TableHead>
                          <TableHead className="text-right">{t("common.covers")}</TableHead>
                          <TableHead className="text-right">{t("dashboard.noShows")}</TableHead>
                          <TableHead className="text-right">{t("reports.cancellations")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.shiftBreakdown.map((shift) => (
                          <TableRow key={shift.shiftName}>
                            <TableCell>{shift.shiftName}</TableCell>
                            <TableCell className="text-right">{shift.reservations}</TableCell>
                            <TableCell className="text-right">{shift.covers}</TableCell>
                            <TableCell className="text-right">{shift.noShows}</TableCell>
                            <TableCell className="text-right">{shift.cancellations}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </UiTable>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </>
  );
}
