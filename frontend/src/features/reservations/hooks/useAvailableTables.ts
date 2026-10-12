import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useSelectedRestaurantId } from "@/hooks/use-auth";
import {
  getTableStatus,
  isTableAvailable,
  tableAvailabilityLabel,
  type TableStatusItem
} from "@/features/reservations/api";
import { normalizeLocalTime } from "@/lib/date";

interface UseAvailableTablesParams {
  date: string;
  startTime: string;
  endTime?: string;
  partySize: number;
  enabled?: boolean;
}

function tableFits(table: TableStatusItem, partySize: number) {
  return table.seats >= partySize;
}

function isAvailable(table: TableStatusItem) {
  return isTableAvailable(table);
}

export function useAvailableTables({
  date,
  startTime,
  endTime,
  partySize,
  enabled = true
}: UseAvailableTablesParams) {
  const selectedRestaurantId = useSelectedRestaurantId();
  const query = useQuery({
    queryKey: ["tables-status", selectedRestaurantId, date, startTime, endTime],
    queryFn: () =>
      getTableStatus({
        date,
        startTime: normalizeLocalTime(startTime),
        endTime: endTime ? normalizeLocalTime(endTime) : undefined
      }),
    enabled: enabled && Boolean(selectedRestaurantId)
  });

  const grouped = useMemo(() => {
    const tables = query.data ?? [];
    const available = tables
      .filter((table) => isAvailable(table))
      .sort((a, b) => {
        const aFits = tableFits(a, partySize);
        const bFits = tableFits(b, partySize);
        if (aFits !== bFits) {
          return Number(bFits) - Number(aFits);
        }
        return a.seats - b.seats;
      });
    const unavailable = tables.filter((table) => !isAvailable(table));

    return {
      available,
      unavailable,
      availabilityLabel: tableAvailabilityLabel
    };
  }, [partySize, query.data]);

  return {
    ...query,
    ...grouped
  };
}
