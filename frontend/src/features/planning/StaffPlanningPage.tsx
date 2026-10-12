import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, format, parseISO, startOfWeek, subWeeks } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { StaffPlanningDay, StaffPlanningShift, StaffWeeklyWorkHours } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  assignStaffToShiftForWeek,
  assignStaffToShift,
  getStaffPlanning,
  getWeeklyWorkHours,
  removeStaffAssignment,
  setWeeklyWorkHours
} from "@/features/shifts/planning-api";
import { useSelectedRestaurantId, useUserRole } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { normalizeLocalTime } from "@/lib/date";
import { showApiError, showSuccess } from "@/lib/toast";

function toWeekStart(date: string) {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function shiftDurationHours(shift: StaffPlanningShift) {
  let minutes = timeToMinutes(shift.endTime) - timeToMinutes(shift.startTime);
  if (minutes <= 0) {
    minutes += 24 * 60;
  }
  return minutes / 60;
}

function shiftLoadClass(assigned: number, total: number) {
  if (total === 0 || assigned === 0) return "bg-rose-500";
  if (assigned < total) return "bg-amber-500";
  return "bg-emerald-600";
}

function dayLabel(date: string) {
  return format(parseISO(date), "EEE dd/MM");
}

function weekRangeLabel(weekStart: string) {
  const start = parseISO(weekStart);
  const end = addDays(start, 6);
  return `${format(start, "dd MMM")} - ${format(end, "dd MMM yyyy")}`;
}

type Copy = typeof COPY.en;

function useCopy(): Copy {
  const { locale } = useI18n();
  return (COPY[locale] ?? COPY.en) as Copy;
}

export function StaffPlanningPage() {
  const copy = useCopy();
  const queryClient = useQueryClient();
  const selectedRestaurantId = useSelectedRestaurantId();
  const role = useUserRole();
  const canManage = role === "OWNER" || role === "MANAGER";

  const [weekStart, setWeekStart] = useState(() => toWeekStart(format(new Date(), "yyyy-MM-dd")));
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [selectedAssignUserId, setSelectedAssignUserId] = useState<string>("");
  const [selectedAssignStartTime, setSelectedAssignStartTime] = useState<string>("");
  const [selectedAssignEndTime, setSelectedAssignEndTime] = useState<string>("");
  const [assignForWholeWeek, setAssignForWholeWeek] = useState(false);
  const [plannedHoursDraft, setPlannedHoursDraft] = useState<Record<string, string>>({});

  const weekDates = useMemo(() => {
    const start = parseISO(weekStart);
    return Array.from({ length: 7 }, (_, index) => format(addDays(start, index), "yyyy-MM-dd"));
  }, [weekStart]);

  const dayQueries = useQueries({
    queries: weekDates.map((date) => ({
      queryKey: ["staff-planning", selectedRestaurantId, date],
      queryFn: () => getStaffPlanning(date),
      enabled: Boolean(selectedRestaurantId)
    }))
  });

  const weeklyHoursQuery = useQuery({
    queryKey: ["staff-weekly-hours", selectedRestaurantId, weekStart],
    queryFn: () => getWeeklyWorkHours(weekStart),
    enabled: Boolean(selectedRestaurantId)
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { shiftId: string; userId: string; serviceDate: string; startTime?: string; endTime?: string }) => assignStaffToShift(payload),
    onSuccess: () => {
      showSuccess(copy.staffAssigned);
      weekDates.forEach((date) => {
        void queryClient.invalidateQueries({ queryKey: ["staff-planning", selectedRestaurantId, date] });
      });
      void queryClient.invalidateQueries({ queryKey: ["staff-weekly-hours", selectedRestaurantId, weekStart] });
      setSelectedAssignUserId("");
    },
    onError: (error) => showApiError(error)
  });

  const assignWeekMutation = useMutation({
    mutationFn: (payload: { shiftId: string; userId: string; serviceDate: string; startTime?: string; endTime?: string }) => assignStaffToShiftForWeek(payload),
    onSuccess: (result) => {
      showSuccess(`${copy.staffAssignedRecurring} (${result.assignedCount}/7)`);
      weekDates.forEach((date) => {
        void queryClient.invalidateQueries({ queryKey: ["staff-planning", selectedRestaurantId, date] });
      });
      void queryClient.invalidateQueries({ queryKey: ["staff-weekly-hours", selectedRestaurantId, weekStart] });
      setSelectedAssignUserId("");
    },
    onError: (error) => showApiError(error)
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => removeStaffAssignment(assignmentId),
    onSuccess: () => {
      showSuccess(copy.assignmentRemoved);
      weekDates.forEach((date) => {
        void queryClient.invalidateQueries({ queryKey: ["staff-planning", selectedRestaurantId, date] });
      });
      void queryClient.invalidateQueries({ queryKey: ["staff-weekly-hours", selectedRestaurantId, weekStart] });
    },
    onError: (error) => showApiError(error)
  });

  const setHoursMutation = useMutation({
    mutationFn: (payload: { userId: string; weekStartDate: string; plannedHours: number }) => setWeeklyWorkHours(payload),
    onSuccess: () => {
      showSuccess(copy.hoursSaved);
      void queryClient.invalidateQueries({ queryKey: ["staff-weekly-hours", selectedRestaurantId, weekStart] });
    },
    onError: (error) => showApiError(error)
  });

  const dayPlans = useMemo(
    () =>
      weekDates.map((date, index) => ({
        date,
        query: dayQueries[index],
        data: (dayQueries[index]?.data ?? null) as StaffPlanningDay | null
      })),
    [dayQueries, weekDates]
  );

  const selectedDayEntry = useMemo(
    () => dayPlans.find((entry) => entry.date === selectedDate) ?? null,
    [dayPlans, selectedDate]
  );

  const selectedDayPlan = selectedDayEntry?.data ?? null;

  const isSelectedDayPending = Boolean(
    selectedDayEntry &&
      (selectedDayEntry.query.isLoading || (selectedDayEntry.query.isFetching && !selectedDayEntry.data))
  );

  const selectedShift = useMemo(() => {
    if (!selectedDayPlan || selectedDayPlan.shifts.length === 0) return null;
    return selectedDayPlan.shifts.find((shift) => shift.shiftId === selectedShiftId) ?? selectedDayPlan.shifts[0];
  }, [selectedDayPlan, selectedShiftId]);

  useEffect(() => {
    if (!weekDates.includes(selectedDate)) {
      setSelectedDate(weekDates[0]);
      setSelectedShiftId("");
      setSelectedAssignUserId("");
      setSelectedAssignStartTime("");
      setSelectedAssignEndTime("");
    }
  }, [selectedDate, weekDates]);

  useEffect(() => {
    if (selectedShift && selectedShift.shiftId !== selectedShiftId) {
      setSelectedShiftId(selectedShift.shiftId);
      setSelectedAssignUserId("");
      setSelectedAssignStartTime(normalizeLocalTime(selectedShift.startTime));
      setSelectedAssignEndTime(normalizeLocalTime(selectedShift.endTime));
    }
  }, [selectedShift, selectedShiftId]);

  useEffect(() => {
    const rows = weeklyHoursQuery.data ?? [];
    if (rows.length === 0) return;

    setPlannedHoursDraft((current) => {
      const next = { ...current };
      rows.forEach((row) => {
        if (!(row.userId in next)) {
          next[row.userId] = String(row.plannedHours ?? 0);
        }
      });
      return next;
    });
  }, [weeklyHoursQuery.data]);

  const isWeekLoading = dayQueries.some((query) => query.isLoading);
  const hasWeekError = dayQueries.some((query) => query.isError);

  const totals = useMemo(() => {
    let shifts = 0;
    let assignedSlots = 0;
    let openSlots = 0;

    dayPlans.forEach((day) => {
      if (!day.data || day.data.restaurantClosed) return;
      day.data.shifts.forEach((shift) => {
        shifts += 1;
        assignedSlots += shift.assignedStaff.length;
        openSlots += shift.availableStaff.length;
      });
    });

    return { shifts, assignedSlots, openSlots };
  }, [dayPlans]);

  const weeklyHoursSummary = useMemo(() => {
    const plannedByUserId = new Map<string, StaffWeeklyWorkHours>((weeklyHoursQuery.data ?? []).map((row) => [row.userId, row]));
    const summary = new Map<
      string,
      { userId: string; fullName?: string | null; email: string; role: string; assignedHours: number; plannedHours: number }
    >();

    dayPlans.forEach((day) => {
      if (!day.data) return;

      day.data.shifts.forEach((shift) => {
        const duration = shiftDurationHours(shift);
        shift.assignedStaff.forEach((staff) => {
          const row = summary.get(staff.userId) ?? {
            userId: staff.userId,
            fullName: staff.fullName,
            email: staff.email,
            role: staff.role,
            assignedHours: 0,
            plannedHours: plannedByUserId.get(staff.userId)?.plannedHours ?? 0
          };

          const assignmentDuration = (() => {
            let minutes = timeToMinutes(staff.endTime) - timeToMinutes(staff.startTime);
            if (minutes <= 0) {
              minutes += 24 * 60;
            }
            return minutes / 60;
          })();

          row.assignedHours += assignmentDuration || duration;
          row.plannedHours = plannedByUserId.get(staff.userId)?.plannedHours ?? row.plannedHours;
          summary.set(staff.userId, row);
        });
      });
    });

    plannedByUserId.forEach((planned, userId) => {
      if (summary.has(userId)) return;
      summary.set(userId, {
        userId,
        fullName: planned.fullName,
        email: planned.email,
        role: planned.role,
        assignedHours: 0,
        plannedHours: planned.plannedHours ?? 0
      });
    });

    return Array.from(summary.values()).sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email));
  }, [dayPlans, weeklyHoursQuery.data]);

  function goToToday() {
    const today = format(new Date(), "yyyy-MM-dd");
    const monday = toWeekStart(today);
    setWeekStart(monday);
    setSelectedDate(today >= monday && today <= format(addDays(parseISO(monday), 6), "yyyy-MM-dd") ? today : monday);
    setSelectedShiftId("");
    setSelectedAssignUserId("");
    setSelectedAssignStartTime("");
    setSelectedAssignEndTime("");
  }

  function moveWeek(direction: "prev" | "next") {
    const nextStart = direction === "prev"
      ? format(subWeeks(parseISO(weekStart), 1), "yyyy-MM-dd")
      : format(addWeeks(parseISO(weekStart), 1), "yyyy-MM-dd");
    setWeekStart(nextStart);
    setSelectedDate(nextStart);
    setSelectedShiftId("");
    setSelectedAssignUserId("");
    setSelectedAssignStartTime("");
    setSelectedAssignEndTime("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => moveWeek("prev")} aria-label={copy.prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-md border px-3 py-2 text-sm font-medium min-w-[170px] text-center">
            {weekRangeLabel(weekStart)}
          </div>
          <Button variant="outline" size="icon" onClick={() => moveWeek("next")} aria-label={copy.nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={goToToday}>{copy.today}</Button>
        </div>
      </div>

      <ErrorBoundary level="section">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{copy.summaryShifts}</CardTitle>
            </CardHeader>
            <CardContent>
              {isWeekLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-semibold">{totals.shifts}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{copy.summaryAssigned}</CardTitle>
            </CardHeader>
            <CardContent>
              {isWeekLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-semibold">{totals.assignedSlots}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{copy.summaryOpen}</CardTitle>
            </CardHeader>
            <CardContent>
              {isWeekLoading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-semibold">{totals.openSlots}</p>}
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>

      <ErrorBoundary level="section">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              {copy.weekTimeline}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isWeekLoading ? (
              <div className="grid gap-3 lg:grid-cols-7">
                {weekDates.map((date) => (
                  <Skeleton key={`sk-${date}`} className="h-40 w-full" />
                ))}
              </div>
            ) : null}

            {!isWeekLoading && hasWeekError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{copy.loadError}</p>
                <Button variant="outline" size="sm" onClick={() => dayQueries.forEach((query) => void query.refetch())}>
                  {copy.retry}
                </Button>
              </div>
            ) : null}

            {!isWeekLoading && !hasWeekError ? (
              <div className="grid gap-3 lg:grid-cols-7">
                {dayPlans.map((day) => {
                  const dayData = day.data;
                  const isSelected = day.date === selectedDate;
                  const isToday = day.date === format(new Date(), "yyyy-MM-dd");

                  return (
                    <button
                      type="button"
                      key={day.date}
                      className={`rounded-md border p-3 text-left transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"}`}
                      onClick={() => {
                        setSelectedDate(day.date);
                        setSelectedShiftId("");
                        setSelectedAssignUserId("");
                      }}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>{dayLabel(day.date)}</p>
                        {isToday ? <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{copy.todayTag}</span> : null}
                      </div>

                      {!dayData ? <p className="text-xs text-muted-foreground">{copy.noData}</p> : null}

                      {dayData?.restaurantClosed ? (
                        <p className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">{copy.closed}</p>
                      ) : null}

                      {dayData && !dayData.restaurantClosed && dayData.shifts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{copy.noShifts}</p>
                      ) : null}

                      {dayData && !dayData.restaurantClosed && dayData.shifts.length > 0 ? (
                        <div className="space-y-2">
                          {dayData.shifts.map((shift) => {
                            const total = shift.assignedStaff.length + shift.availableStaff.length;
                            const assigned = shift.assignedStaff.length;

                            return (
                              <div key={shift.shiftId} className="rounded border bg-background p-2">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <p className="truncate text-xs font-medium">{shift.shiftName}</p>
                                  <span className="text-[10px] text-muted-foreground">{assigned}/{total}</span>
                                </div>
                                <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock3 className="h-3 w-3" />
                                  <span>{shift.startTime} - {shift.endTime}</span>
                                </div>
                                <div className="h-1.5 rounded bg-muted">
                                  <div
                                    className={`h-full rounded ${shiftLoadClass(assigned, total)}`}
                                    style={{ width: `${total === 0 ? 100 : (assigned / total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </ErrorBoundary>

      <ErrorBoundary level="section">
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{copy.assignments}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSelectedDayPending ? (
                <Skeleton className="h-48 w-full" />
              ) : !selectedDayEntry ? (
                <EmptyState title={copy.noDayData} description={copy.noDayDataDesc} />
              ) : !selectedDayPlan ? (
                <EmptyState title={copy.noData} description={copy.loadError} />
              ) : selectedDayPlan.restaurantClosed ? (
                <EmptyState title={copy.closedDayTitle} description={selectedDayPlan.closureReason ?? copy.closedDayDesc} />
              ) : selectedDayPlan.shifts.length === 0 ? (
                <EmptyState title={copy.noShifts} description={copy.noShiftsDesc} />
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {selectedDayPlan.shifts.map((shift) => {
                      const isSelected = shift.shiftId === selectedShift?.shiftId;
                      return (
                        <button
                          key={shift.shiftId}
                          type="button"
                          onClick={() => {
                            setSelectedShiftId(shift.shiftId);
                            setSelectedAssignUserId("");
                            setSelectedAssignStartTime(shift.startTime);
                            setSelectedAssignEndTime(shift.endTime);
                          }}
                          className={`rounded-md border px-3 py-1.5 text-sm ${isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"}`}
                        >
                          {shift.shiftName} ({shift.startTime} - {shift.endTime})
                        </button>
                      );
                    })}
                  </div>

                  {selectedShift ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{copy.assigned}: {selectedShift.assignedStaff.length}</span>
                        <span>{copy.available}: {selectedShift.availableStaff.length}</span>
                      </div>

                      <div className="space-y-2">
                        {selectedShift.assignedStaff.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{copy.noAssigned}</p>
                        ) : (
                          selectedShift.assignedStaff.map((staff) => (
                            <div key={staff.assignmentId} className="flex items-center justify-between rounded-md border p-2">
                              <div>
                                <p className="text-sm font-medium">{staff.fullName || staff.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  {staff.role} · {staff.startTime} - {staff.endTime}
                                </p>
                              </div>
                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => removeMutation.mutate(staff.assignmentId)}
                                  disabled={removeMutation.isPending}
                                  className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                                  aria-label={copy.remove}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>

                      {selectedShift.unavailableStaff.length > 0 ? (
                        <div className="rounded-md border border-dashed p-2">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">{copy.unavailable}</p>
                          <div className="space-y-1">
                            {selectedShift.unavailableStaff.map((staff) => (
                              <p key={staff.userId} className="text-xs text-muted-foreground">
                                {staff.fullName || staff.email} ({staff.reason})
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {canManage ? (
                        <div className="rounded-md border p-3 space-y-2">
                          <p className="text-sm font-medium">{copy.addAssignment}</p>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={assignForWholeWeek}
                              onChange={(event) => setAssignForWholeWeek(event.target.checked)}
                            />
                            {copy.assignWholeWeek}
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={selectedAssignUserId}
                              onChange={(event) => setSelectedAssignUserId(event.target.value)}
                              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            >
                              <option value="">{copy.selectStaff}</option>
                              {selectedShift.availableStaff.map((staff) => (
                                <option key={staff.userId} value={staff.userId}>
                                  {staff.fullName || staff.email} ({staff.role})
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{copy.startTime}</span>
                              <input
                                type="time"
                                value={selectedAssignStartTime}
                                onChange={(event) => setSelectedAssignStartTime(event.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                              />
                            </label>
                            <label className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{copy.endTime}</span>
                              <input
                                type="time"
                                value={selectedAssignEndTime}
                                onChange={(event) => setSelectedAssignEndTime(event.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                              />
                            </label>
                            <Button
                              size="sm"
                              disabled={
                                !selectedAssignUserId ||
                                !selectedAssignStartTime ||
                                !selectedAssignEndTime ||
                                selectedAssignStartTime === selectedAssignEndTime ||
                                assignMutation.isPending ||
                                assignWeekMutation.isPending
                              }
                              onClick={() => {
                                if (!selectedAssignUserId || !selectedShift) return;
                                const payload = {
                                  shiftId: selectedShift.shiftId,
                                  userId: selectedAssignUserId,
                                  serviceDate: selectedDate,
                                  startTime: selectedAssignStartTime,
                                  endTime: selectedAssignEndTime
                                };
                                if (assignForWholeWeek) {
                                  assignWeekMutation.mutate(payload);
                                } else {
                                  assignMutation.mutate(payload);
                                }
                              }}
                            >
                              {copy.assign}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{copy.weeklyHours}</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyHoursQuery.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : weeklyHoursSummary.length === 0 ? (
                <EmptyState title={copy.noHours} description={copy.noHoursDesc} />
              ) : (
                <div className="space-y-2">
                  {weeklyHoursSummary.map((row) => {
                    const variance = row.assignedHours - row.plannedHours;
                    return (
                      <div key={row.userId} className="rounded-md border p-2.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{row.fullName || row.email}</p>
                            <p className="text-xs text-muted-foreground">{row.role}</p>
                          </div>
                          <p className={`text-sm font-medium ${variance > 0 ? "text-amber-700" : variance < 0 ? "text-blue-700" : "text-muted-foreground"}`}>
                            {variance > 0 ? "+" : ""}{variance.toFixed(1)}h
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <p>{copy.assigned}: <span className="font-medium text-foreground">{row.assignedHours.toFixed(1)}h</span></p>
                          <p>{copy.planned}: <span className="font-medium text-foreground">{row.plannedHours.toFixed(1)}h</span></p>
                        </div>

                        {canManage ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={plannedHoursDraft[row.userId] ?? String(row.plannedHours)}
                              onChange={(event) =>
                                setPlannedHoursDraft((current) => ({ ...current, [row.userId]: event.target.value }))
                              }
                              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={setHoursMutation.isPending}
                              onClick={() => {
                                const parsed = Number(plannedHoursDraft[row.userId] ?? row.plannedHours);
                                if (Number.isNaN(parsed) || parsed < 0) return;
                                setHoursMutation.mutate({
                                  userId: row.userId,
                                  weekStartDate: weekStart,
                                  plannedHours: parsed
                                });
                              }}
                            >
                              {copy.save}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    </div>
  );
}

const COPY = {
  en: {
    title: "Staff Planning",
    subtitle: "Plan the week, assign staff quickly, and track staffing gaps.",
    prevWeek: "Previous week",
    nextWeek: "Next week",
    today: "Today",
    todayTag: "Today",
    weekTimeline: "Week timeline",
    loadError: "Unable to load planning for this week.",
    retry: "Retry",
    noData: "No data",
    closed: "Closed",
    noShifts: "No shifts",
    noShiftsDesc: "Create active shifts for this day to start assigning staff.",
    assignments: "Shift assignments",
    noDayData: "No day selected",
    noDayDataDesc: "Pick a day from the week timeline.",
    closedDayTitle: "Restaurant closed",
    closedDayDesc: "This day is marked as closed.",
    assigned: "Assigned",
    available: "Available",
    unavailable: "Unavailable",
    noAssigned: "No staff assigned yet.",
    remove: "Remove",
    addAssignment: "Add assignment",
    startTime: "Start",
    endTime: "End",
    selectStaff: "Select staff member",
    assign: "Assign",
    assignWholeWeek: "Repeat for whole week",
    staffAssigned: "Staff assigned",
    staffAssignedRecurring: "Recurring assignment created",
    assignmentRemoved: "Assignment removed",
    summaryShifts: "Total shifts",
    summaryAssigned: "Assigned slots",
    summaryOpen: "Open slots",
    weeklyHours: "Weekly work hours",
    noHours: "No staff hours",
    noHoursDesc: "Assign staff to shifts or set planned hours for this week.",
    planned: "Planned",
    save: "Save",
    hoursSaved: "Weekly hours updated"
  },
  nl: {
    title: "Personeelsplanning",
    subtitle: "Plan de week, wijs snel medewerkers toe en zie meteen tekorten.",
    prevWeek: "Vorige week",
    nextWeek: "Volgende week",
    today: "Vandaag",
    todayTag: "Vandaag",
    weekTimeline: "Weektijdlijn",
    loadError: "Kan planning voor deze week niet laden.",
    retry: "Opnieuw",
    noData: "Geen data",
    closed: "Gesloten",
    noShifts: "Geen shifts",
    noShiftsDesc: "Maak actieve shifts voor deze dag om personeel in te plannen.",
    assignments: "Shift toewijzingen",
    noDayData: "Geen dag geselecteerd",
    noDayDataDesc: "Kies een dag in de weektijdlijn.",
    closedDayTitle: "Restaurant gesloten",
    closedDayDesc: "Deze dag staat als gesloten.",
    assigned: "Ingepland",
    available: "Beschikbaar",
    unavailable: "Niet beschikbaar",
    noAssigned: "Nog niemand ingepland.",
    remove: "Verwijderen",
    addAssignment: "Toewijzing toevoegen",
    startTime: "Start",
    endTime: "Stop",
    selectStaff: "Selecteer medewerker",
    assign: "Toewijzen",
    assignWholeWeek: "Herhalen voor hele week",
    staffAssigned: "Medewerker toegewezen",
    staffAssignedRecurring: "Terugkerende toewijzing gemaakt",
    assignmentRemoved: "Toewijzing verwijderd",
    summaryShifts: "Totaal shifts",
    summaryAssigned: "Ingeplande plekken",
    summaryOpen: "Open plekken",
    weeklyHours: "Wekelijkse werkuren",
    noHours: "Geen uren",
    noHoursDesc: "Wijs personeel toe of stel geplande uren in voor deze week.",
    planned: "Gepland",
    save: "Opslaan",
    hoursSaved: "Wekelijkse uren bijgewerkt"
  },
  fr: {
    title: "Planification du personnel",
    subtitle: "Planifiez la semaine, affectez rapidement et suivez les manques.",
    prevWeek: "Semaine precedente",
    nextWeek: "Semaine suivante",
    today: "Aujourd'hui",
    todayTag: "Aujourd'hui",
    weekTimeline: "Chronologie hebdomadaire",
    loadError: "Impossible de charger la planification de la semaine.",
    retry: "Reessayer",
    noData: "Aucune donnee",
    closed: "Ferme",
    noShifts: "Aucun service",
    noShiftsDesc: "Creez des services actifs pour commencer les affectations.",
    assignments: "Affectations",
    noDayData: "Aucun jour selectionne",
    noDayDataDesc: "Selectionnez un jour dans la chronologie.",
    closedDayTitle: "Restaurant ferme",
    closedDayDesc: "Ce jour est marque comme ferme.",
    assigned: "Affectes",
    available: "Disponibles",
    unavailable: "Indisponibles",
    noAssigned: "Personne n'est affecte.",
    remove: "Retirer",
    addAssignment: "Ajouter une affectation",
    startTime: "Debut",
    endTime: "Fin",
    selectStaff: "Selectionner un employe",
    assign: "Affecter",
    assignWholeWeek: "Repeter pour toute la semaine",
    staffAssigned: "Employe affecte",
    staffAssignedRecurring: "Affectation recurrente creee",
    assignmentRemoved: "Affectation retiree",
    summaryShifts: "Total services",
    summaryAssigned: "Postes affectes",
    summaryOpen: "Postes ouverts",
    weeklyHours: "Heures hebdomadaires",
    noHours: "Aucune heure",
    noHoursDesc: "Affectez du personnel ou definissez les heures planifiees.",
    planned: "Planifie",
    save: "Enregistrer",
    hoursSaved: "Heures hebdomadaires mises a jour"
  },
  es: {
    title: "Planificacion de personal",
    subtitle: "Planifica la semana, asigna rapido y detecta faltantes.",
    prevWeek: "Semana anterior",
    nextWeek: "Semana siguiente",
    today: "Hoy",
    todayTag: "Hoy",
    weekTimeline: "Linea de tiempo semanal",
    loadError: "No se puede cargar la planificacion de esta semana.",
    retry: "Reintentar",
    noData: "Sin datos",
    closed: "Cerrado",
    noShifts: "Sin turnos",
    noShiftsDesc: "Crea turnos activos para empezar a asignar personal.",
    assignments: "Asignaciones de turno",
    noDayData: "No hay dia seleccionado",
    noDayDataDesc: "Elige un dia en la linea de tiempo.",
    closedDayTitle: "Restaurante cerrado",
    closedDayDesc: "Este dia esta marcado como cerrado.",
    assigned: "Asignados",
    available: "Disponibles",
    unavailable: "No disponibles",
    noAssigned: "Aun no hay personal asignado.",
    remove: "Quitar",
    addAssignment: "Agregar asignacion",
    startTime: "Inicio",
    endTime: "Fin",
    selectStaff: "Seleccionar personal",
    assign: "Asignar",
    assignWholeWeek: "Repetir para toda la semana",
    staffAssigned: "Personal asignado",
    staffAssignedRecurring: "Asignacion recurrente creada",
    assignmentRemoved: "Asignacion eliminada",
    summaryShifts: "Turnos totales",
    summaryAssigned: "Plazas asignadas",
    summaryOpen: "Plazas abiertas",
    weeklyHours: "Horas semanales",
    noHours: "Sin horas",
    noHoursDesc: "Asigna personal o define horas planificadas para la semana.",
    planned: "Planificadas",
    save: "Guardar",
    hoursSaved: "Horas semanales actualizadas"
  }
} as const;
