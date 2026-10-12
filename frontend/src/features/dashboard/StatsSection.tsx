import { useQuery } from "@tanstack/react-query";
import { addMonths, addWeeks, format, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton, TableSkeleton } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getDailyStats,
  getMonthlyStats,
  getWeeklyStats,
  type DailyStats,
  type MonthlyStats,
  type StatusBreakdown,
  type WeeklyStats
} from "@/features/dashboard/api";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";

type LocaleKey = keyof typeof COPY;

function statusRows(byStatus: StatusBreakdown, locale: LocaleKey) {
  const copy = COPY[locale];
  return [
    { label: copy.confirmed, value: byStatus.confirmed },
    { label: copy.seated, value: byStatus.seated },
    { label: copy.completed, value: byStatus.completed },
    { label: copy.noShows, value: byStatus.noShow },
    { label: copy.cancelled, value: byStatus.cancelled }
  ];
}

export function StatsSection() {
  const { locale } = useI18n();
  const selectedRestaurantId = useSelectedRestaurantId();
  const key = locale as LocaleKey;
  const copy = COPY[key];
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dailyDate, setDailyDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weeklyStart, setWeeklyStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [monthStart, setMonthStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));

  const dailyQuery = useQuery({
    queryKey: ["dashboard-stats-daily", selectedRestaurantId, dailyDate],
    queryFn: () => getDailyStats(dailyDate),
    enabled: expanded && period === "daily" && Boolean(selectedRestaurantId)
  });

  const weeklyQuery = useQuery({
    queryKey: ["dashboard-stats-weekly", selectedRestaurantId, weeklyStart],
    queryFn: () => getWeeklyStats(weeklyStart),
    enabled: expanded && period === "weekly" && Boolean(selectedRestaurantId)
  });

  const monthlyQuery = useQuery({
    queryKey: ["dashboard-stats-monthly", selectedRestaurantId, monthStart],
    queryFn: () => getMonthlyStats(monthStart),
    enabled: expanded && period === "monthly" && Boolean(selectedRestaurantId)
  });

  const selectedMonthValue = useMemo(() => format(parseISO(monthStart), "yyyy-MM"), [monthStart]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>{copy.statistics}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((value) => !value)} className="gap-2">
          {expanded ? copy.hide : copy.show}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </Button>
      </CardHeader>

      {expanded ? (
        <CardContent className="space-y-4">
          <Tabs value={period} onValueChange={(value) => setPeriod(value as "daily" | "weekly" | "monthly")}>
            <TabsList>
              <TabsTrigger value="daily">{copy.daily}</TabsTrigger>
              <TabsTrigger value="weekly">{copy.weekly}</TabsTrigger>
              <TabsTrigger value="monthly">{copy.monthly}</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <div className="flex items-center gap-2">
                <label htmlFor="stats-daily-date" className="text-sm font-medium">{copy.date}</label>
                <input
                  id="stats-daily-date"
                  type="date"
                  value={dailyDate}
                  onChange={(event) => setDailyDate(event.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <DailyView stats={dailyQuery.data} isLoading={dailyQuery.isLoading} isError={dailyQuery.isError} onRetry={() => void dailyQuery.refetch()} locale={key} />
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => setWeeklyStart(format(subWeeks(parseISO(weeklyStart), 1), "yyyy-MM-dd"))} aria-label={copy.previousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => setWeeklyStart(format(addWeeks(parseISO(weeklyStart), 1), "yyyy-MM-dd"))} aria-label={copy.nextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{copy.weekOf} <span className="font-semibold text-foreground">{format(parseISO(weeklyStart), "MMM d, yyyy")}</span></p>
              </div>
              <WeeklyView stats={weeklyQuery.data} isLoading={weeklyQuery.isLoading} isError={weeklyQuery.isError} onRetry={() => void weeklyQuery.refetch()} locale={key} />
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => setMonthStart(format(subMonths(parseISO(monthStart), 1), "yyyy-MM-dd"))} aria-label={copy.previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => setMonthStart(format(addMonths(parseISO(monthStart), 1), "yyyy-MM-dd"))} aria-label={copy.nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <label htmlFor="stats-month-picker" className="sr-only">{copy.month}</label>
                <input
                  id="stats-month-picker"
                  type="month"
                  value={selectedMonthValue}
                  onChange={(event) => setMonthStart(`${event.target.value}-01`)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <MonthlyView stats={monthlyQuery.data} isLoading={monthlyQuery.isLoading} isError={monthlyQuery.isError} onRetry={() => void monthlyQuery.refetch()} locale={key} />
            </TabsContent>
          </Tabs>
        </CardContent>
      ) : null}
    </Card>
  );
}

function DailyView({ stats, isLoading, isError, onRetry, locale }: { stats?: DailyStats; isLoading: boolean; isError: boolean; onRetry: () => void; locale: LocaleKey }) {
  const copy = COPY[locale];
  if (isLoading) return <CardSkeleton />;
  if (isError) return <div className="space-y-2"><p className="text-sm text-destructive">{copy.failedDaily}</p><Button variant="outline" size="sm" onClick={onRetry}>{copy.retry}</Button></div>;
  if (!stats) return <EmptyState title={copy.noStats} description={copy.noDailyData} />;

  const statuses = statusRows(stats.byStatus, locale);
  const statusMax = Math.max(...statuses.map((item) => item.value), 1);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">{copy.reservationsByStatus}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {statuses.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm"><span>{item.label}</span><span className="font-bold">{item.value}</span></div>
              <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((item.value / statusMax) * 100)}%` }} /></div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">{copy.coversByShift}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {stats.byShift.length === 0 ? <p className="text-sm text-muted-foreground">{copy.noShiftData}</p> : null}
          {stats.byShift.map((shift) => (
            <div key={shift.name} className="rounded-md border p-3">
              <p className="text-sm font-medium">{shift.name}</p>
              <p className="text-sm">{copy.covers}: <span className="font-bold">{shift.covers}</span></p>
              <p className="text-sm">{copy.reservations}: <span className="font-bold">{shift.reservations}</span></p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function WeeklyView({ stats, isLoading, isError, onRetry, locale }: { stats?: WeeklyStats; isLoading: boolean; isError: boolean; onRetry: () => void; locale: LocaleKey }) {
  const copy = COPY[locale];
  if (isLoading) return <TableSkeleton />;
  if (isError) return <div className="space-y-2"><p className="text-sm text-destructive">{copy.failedWeekly}</p><Button variant="outline" size="sm" onClick={onRetry}>{copy.retry}</Button></div>;
  if (!stats) return <EmptyState title={copy.noStats} description={copy.noWeeklyData} />;

  return (
    <Table>
      <TableHeader><TableRow><TableHead>{copy.date}</TableHead><TableHead className="text-right">{copy.reservations}</TableHead><TableHead className="text-right">{copy.covers}</TableHead><TableHead className="text-right">{copy.noShows}</TableHead></TableRow></TableHeader>
      <TableBody>
        {stats.dailyBreakdown.map((day) => (
          <TableRow key={day.date}>
            <TableCell>{format(parseISO(day.date), "EEE, MMM d")}</TableCell>
            <TableCell className="text-right font-bold">{day.totalReservations}</TableCell>
            <TableCell className="text-right font-bold">{day.totalCovers}</TableCell>
            <TableCell className="text-right font-bold">{day.byStatus.noShow}</TableCell>
          </TableRow>
        ))}
        <TableRow><TableCell className="font-semibold">{copy.weekTotal}</TableCell><TableCell className="text-right font-bold">{stats.totals.totalReservations}</TableCell><TableCell className="text-right font-bold">{stats.totals.totalCovers}</TableCell><TableCell className="text-right font-bold">{stats.totals.noShow}</TableCell></TableRow>
      </TableBody>
    </Table>
  );
}

function MonthlyView({ stats, isLoading, isError, onRetry, locale }: { stats?: MonthlyStats; isLoading: boolean; isError: boolean; onRetry: () => void; locale: LocaleKey }) {
  const copy = COPY[locale];
  if (isLoading) return <TableSkeleton />;
  if (isError) return <div className="space-y-2"><p className="text-sm text-destructive">{copy.failedMonthly}</p><Button variant="outline" size="sm" onClick={onRetry}>{copy.retry}</Button></div>;
  if (!stats) return <EmptyState title={copy.noStats} description={copy.noMonthlyData} />;

  return (
    <Table>
      <TableHeader><TableRow><TableHead>{copy.week}</TableHead><TableHead className="text-right">{copy.reservations}</TableHead><TableHead className="text-right">{copy.covers}</TableHead><TableHead className="text-right">{copy.noShows}</TableHead></TableRow></TableHeader>
      <TableBody>
        {stats.weeklyBreakdown.map((week) => (
          <TableRow key={week.weekStart}>
            <TableCell>{format(parseISO(week.weekStart), "MMM d")} - {format(parseISO(week.weekEnd), "MMM d")}</TableCell>
            <TableCell className="text-right font-bold">{week.totals.totalReservations}</TableCell>
            <TableCell className="text-right font-bold">{week.totals.totalCovers}</TableCell>
            <TableCell className="text-right font-bold">{week.totals.noShow}</TableCell>
          </TableRow>
        ))}
        <TableRow><TableCell className="font-semibold">{copy.monthTotal}</TableCell><TableCell className="text-right font-bold">{stats.totals.totalReservations}</TableCell><TableCell className="text-right font-bold">{stats.totals.totalCovers}</TableCell><TableCell className="text-right font-bold">{stats.totals.noShow}</TableCell></TableRow>
      </TableBody>
    </Table>
  );
}

const COPY = {
  en: { statistics: "Statistics", hide: "Hide", show: "Show", daily: "Daily", weekly: "Weekly", monthly: "Monthly", date: "Date", previousWeek: "Previous week", nextWeek: "Next week", weekOf: "Week of", previousMonth: "Previous month", nextMonth: "Next month", month: "Month", failedDaily: "Failed to load daily statistics.", failedWeekly: "Failed to load weekly statistics.", failedMonthly: "Failed to load monthly statistics.", retry: "Retry", noStats: "No statistics found", noDailyData: "No daily data is available for this date.", noWeeklyData: "No weekly data is available for this period.", noMonthlyData: "No monthly data is available for this period.", reservationsByStatus: "Reservations by status", coversByShift: "Covers by shift", noShiftData: "No shift data.", covers: "Covers", reservations: "Reservations", noShows: "No-shows", weekTotal: "Week Total", week: "Week", monthTotal: "Month Total", confirmed: "Confirmed", seated: "Seated", completed: "Completed", cancelled: "Cancelled" },
  nl: { statistics: "Statistieken", hide: "Verbergen", show: "Tonen", daily: "Dagelijks", weekly: "Wekelijks", monthly: "Maandelijks", date: "Datum", previousWeek: "Vorige week", nextWeek: "Volgende week", weekOf: "Week van", previousMonth: "Vorige maand", nextMonth: "Volgende maand", month: "Maand", failedDaily: "Dagelijkse statistieken laden mislukt.", failedWeekly: "Wekelijkse statistieken laden mislukt.", failedMonthly: "Maandelijkse statistieken laden mislukt.", retry: "Opnieuw", noStats: "Geen statistieken gevonden", noDailyData: "Geen dagelijkse data beschikbaar voor deze datum.", noWeeklyData: "Geen wekelijkse data beschikbaar voor deze periode.", noMonthlyData: "Geen maandelijkse data beschikbaar voor deze periode.", reservationsByStatus: "Reserveringen per status", coversByShift: "Covers per shift", noShiftData: "Geen shiftdata.", covers: "Covers", reservations: "Reserveringen", noShows: "No-shows", weekTotal: "Weektotaal", week: "Week", monthTotal: "Maandtotaal", confirmed: "Bevestigd", seated: "Geplaatst", completed: "Afgerond", cancelled: "Geannuleerd" },
  fr: { statistics: "Statistiques", hide: "Masquer", show: "Afficher", daily: "Quotidien", weekly: "Hebdomadaire", monthly: "Mensuel", date: "Date", previousWeek: "Semaine precedente", nextWeek: "Semaine suivante", weekOf: "Semaine du", previousMonth: "Mois precedent", nextMonth: "Mois suivant", month: "Mois", failedDaily: "Echec du chargement des statistiques quotidiennes.", failedWeekly: "Echec du chargement des statistiques hebdomadaires.", failedMonthly: "Echec du chargement des statistiques mensuelles.", retry: "Reessayer", noStats: "Aucune statistique trouvee", noDailyData: "Aucune donnee quotidienne disponible pour cette date.", noWeeklyData: "Aucune donnee hebdomadaire disponible pour cette periode.", noMonthlyData: "Aucune donnee mensuelle disponible pour cette periode.", reservationsByStatus: "Reservations par statut", coversByShift: "Couverts par service", noShiftData: "Aucune donnee de service.", covers: "Couverts", reservations: "Reservations", noShows: "No-shows", weekTotal: "Total semaine", week: "Semaine", monthTotal: "Total mois", confirmed: "Confirmee", seated: "Installee", completed: "Terminee", cancelled: "Annulee" },
  es: { statistics: "Estadisticas", hide: "Ocultar", show: "Mostrar", daily: "Diario", weekly: "Semanal", monthly: "Mensual", date: "Fecha", previousWeek: "Semana anterior", nextWeek: "Semana siguiente", weekOf: "Semana de", previousMonth: "Mes anterior", nextMonth: "Mes siguiente", month: "Mes", failedDaily: "Error al cargar estadisticas diarias.", failedWeekly: "Error al cargar estadisticas semanales.", failedMonthly: "Error al cargar estadisticas mensuales.", retry: "Reintentar", noStats: "No se encontraron estadisticas", noDailyData: "No hay datos diarios para esta fecha.", noWeeklyData: "No hay datos semanales para este periodo.", noMonthlyData: "No hay datos mensuales para este periodo.", reservationsByStatus: "Reservas por estado", coversByShift: "Comensales por turno", noShiftData: "Sin datos de turnos.", covers: "Comensales", reservations: "Reservas", noShows: "No-shows", weekTotal: "Total semanal", week: "Semana", monthTotal: "Total mensual", confirmed: "Confirmada", seated: "Sentada", completed: "Completada", cancelled: "Cancelada" }
} as const;
