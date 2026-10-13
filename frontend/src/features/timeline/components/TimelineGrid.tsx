import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { TimelineReservation, TimelineShift, TimelineTable } from "@/features/timeline/api";
import { TimelineReservationBlock } from "@/features/timeline/components/TimelineReservationBlock";

const LEFT_COLUMN_WIDTH = 168;
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 58;
const CELL_WIDTH = 56;
const MINUTES_IN_DAY = 24 * 60;

interface TimelineGridProps {
  date: string;
  tables: TimelineTable[];
  reservations: TimelineReservation[];
  shifts?: TimelineShift[];
  slotMinutes: 15 | 30 | 60;
  scrollToNowSignal?: number;
}

function parseTimeToMinutes(timeValue: string) {
  const [hoursText, minutesText] = timeValue.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return Math.max(0, Math.min(MINUTES_IN_DAY, hours * 60 + minutes));
}

/** Duration in minutes; overnight ranges (end <= start) wrap past midnight. */
function spanMinutes(startMinutes: number, endMinutes: number) {
  let duration = endMinutes - startMinutes;
  if (duration <= 0) {
    duration += MINUTES_IN_DAY;
  }
  return duration;
}

export function TimelineGrid({
  date,
  tables,
  reservations,
  shifts = [],
  slotMinutes,
  scrollToNowSignal = 0
}: TimelineGridProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const safeSlotMinutes = slotMinutes;
  const slotCount = MINUTES_IN_DAY / safeSlotMinutes;
  const dayGridWidth = slotCount * CELL_WIDTH;
  const totalWidth = LEFT_COLUMN_WIDTH + dayGridWidth;
  const rowsHeight = tables.length * ROW_HEIGHT;

  const tableRowByLabel = useMemo(
    () => new Map(tables.map((table, index) => [table.label, index])),
    [tables]
  );

  const [now, setNow] = useState(new Date());
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const currentLineOffset = useMemo(() => {
    const today = format(now, "yyyy-MM-dd");
    if (today !== date) {
      return null;
    }

    const minutes = now.getHours() * 60 + now.getMinutes();
    return LEFT_COLUMN_WIDTH + (minutes / safeSlotMinutes) * CELL_WIDTH;
  }, [date, now, safeSlotMinutes]);

  useEffect(() => {
    if (!scrollToNowSignal || currentLineOffset === null || !containerRef.current) {
      return;
    }

    const targetLeft = Math.max(currentLineOffset - LEFT_COLUMN_WIDTH - 120, 0);
    containerRef.current.scrollTo({
      left: targetLeft,
      behavior: "smooth"
    });
  }, [currentLineOffset, scrollToNowSignal]);

  useEffect(() => {
    setActiveCell((current) => ({
      row: Math.max(0, Math.min(current.row, Math.max(0, tables.length - 1))),
      col: Math.max(0, Math.min(current.col, Math.max(0, slotCount - 1)))
    }));
  }, [slotCount, tables.length]);

  const focusCell = (row: number, col: number) => {
    const key = `${row}-${col}`;
    const element = cellRefs.current[key];
    if (element) {
      element.focus();
    }
  };

  const formatMinuteLabel = (minute: number) => {
    const hours = String(Math.floor(minute / 60)).padStart(2, "0");
    const mins = String(minute % 60).padStart(2, "0");
    return `${hours}:${mins}`;
  };

  return (
    <TooltipProvider delayDuration={120}>
      <div ref={containerRef} className="overflow-auto rounded-md border">
        <div className="relative min-w-max bg-background" style={{ width: totalWidth }} role="grid" aria-label="Timeline grid by table and time">
          <div className="sticky top-0 z-30 flex border-b bg-background" role="row">
            <div
              className="sticky left-0 z-40 flex items-center border-r bg-background px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              style={{ width: LEFT_COLUMN_WIDTH, minWidth: LEFT_COLUMN_WIDTH, height: HEADER_HEIGHT }}
              role="columnheader"
            >
              Tables
            </div>
            <div className="flex">
              {Array.from({ length: slotCount }).map((_, index) => {
                const minute = index * safeSlotMinutes;
                const hourLabel = minute % 60 === 0;
                return (
                  <div
                    key={`slot-${minute}`}
                    className={`flex items-center border-r px-1 text-xs text-muted-foreground ${hourLabel ? "font-medium" : ""}`}
                    style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, height: HEADER_HEIGHT }}
                    role="columnheader"
                  >
                    {hourLabel ? `${String(Math.floor(minute / 60)).padStart(2, "0")}:00` : ""}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative" style={{ height: rowsHeight }}>
            {shifts.map((shift, index) => {
              const start = parseTimeToMinutes(shift.startTime);
              const end = parseTimeToMinutes(shift.endTime);
              const left = LEFT_COLUMN_WIDTH + (start / safeSlotMinutes) * CELL_WIDTH;
              const rawWidth = (spanMinutes(start, end) / safeSlotMinutes) * CELL_WIDTH;
              const maxWidth = Math.max(dayGridWidth - (start / safeSlotMinutes) * CELL_WIDTH, 0);
              const width = Math.min(rawWidth, maxWidth);
              const bgClass = index % 2 === 0 ? "bg-emerald-100/25" : "bg-orange-100/25";

              return (
                <div
                  key={`${shift.name}-${shift.startTime}`}
                  className={`pointer-events-none absolute top-0 z-0 ${bgClass}`}
                  style={{ left, width, height: rowsHeight }}
                  title={`${shift.name}: ${shift.startTime}-${shift.endTime}`}
                />
              );
            })}

            {currentLineOffset !== null ? (
              <div
                className="pointer-events-none absolute z-20 w-0.5 bg-orange-500"
                style={{ left: currentLineOffset, top: 0, height: rowsHeight }}
              />
            ) : null}

            <div className="relative z-10">
              {tables.map((table, rowIndex) => (
                <div key={table.id} className="flex border-b last:border-b-0" style={{ height: ROW_HEIGHT }} role="row">
                  <div
                    className="sticky left-0 z-20 flex items-center border-r bg-background px-3"
                    style={{ width: LEFT_COLUMN_WIDTH, minWidth: LEFT_COLUMN_WIDTH }}
                    role="rowheader"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{table.label}</p>
                      <p className="text-xs text-muted-foreground">{table.seats} seats</p>
                    </div>
                  </div>

                  <div className="flex">
                    {Array.from({ length: slotCount }).map((_, index) => {
                      const minute = index * safeSlotMinutes;
                      const isHourBoundary = minute % 60 === 0;
                      const isActive = activeCell.row === rowIndex && activeCell.col === index;
                      const cellKey = `${rowIndex}-${index}`;
                      return (
                        <button
                          key={`cell-${table.id}-${index}`}
                          ref={(element) => {
                            cellRefs.current[cellKey] = element;
                          }}
                          type="button"
                          role="gridcell"
                          tabIndex={isActive ? 0 : -1}
                          aria-label={`${table.label} at ${formatMinuteLabel(minute)}`}
                          className={`border-r focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isHourBoundary ? "bg-muted/20" : ""}`}
                          style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, height: ROW_HEIGHT }}
                          onFocus={() => setActiveCell({ row: rowIndex, col: index })}
                          onKeyDown={(event) => {
                            let nextRow = rowIndex;
                            let nextCol = index;

                            if (event.key === "ArrowRight") nextCol = Math.min(slotCount - 1, index + 1);
                            if (event.key === "ArrowLeft") nextCol = Math.max(0, index - 1);
                            if (event.key === "ArrowDown") nextRow = Math.min(tables.length - 1, rowIndex + 1);
                            if (event.key === "ArrowUp") nextRow = Math.max(0, rowIndex - 1);

                            if (nextRow !== rowIndex || nextCol !== index) {
                              event.preventDefault();
                              setActiveCell({ row: nextRow, col: nextCol });
                              focusCell(nextRow, nextCol);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {reservations.map((reservation) => {
              const rows = Array.from(new Set(reservation.tableLabels))
                .map((label) => tableRowByLabel.get(label))
                .filter((value): value is number => typeof value === "number")
                .sort((a, b) => a - b);

              if (rows.length === 0) {
                return null;
              }

              const startMinutes = parseTimeToMinutes(reservation.startTime);
              const endMinutes = parseTimeToMinutes(reservation.endTime);
              const topRow = rows[0];
              const bottomRow = rows[rows.length - 1];

              const left = LEFT_COLUMN_WIDTH + (startMinutes / safeSlotMinutes) * CELL_WIDTH + 2;
              const rawWidth = (spanMinutes(startMinutes, endMinutes) / safeSlotMinutes) * CELL_WIDTH - 4;
              const maxWidth = Math.max(dayGridWidth - (startMinutes / safeSlotMinutes) * CELL_WIDTH - 4, CELL_WIDTH - 8);
              const width = Math.max(Math.min(rawWidth, maxWidth), CELL_WIDTH - 8);
              const top = topRow * ROW_HEIGHT + 6;
              const height = (bottomRow - topRow + 1) * ROW_HEIGHT - 12;

              return (
                <TimelineReservationBlock
                  key={reservation.id}
                  reservation={reservation}
                  style={{ left, top, width, height }}
                  onClick={(reservationId) => navigate(`/reservations/${reservationId}`)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
