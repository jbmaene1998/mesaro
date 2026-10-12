import { formatInTimeZone } from "date-fns-tz";
import { parseISO } from "date-fns";

import type { Reservation } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-media-query";
import { useI18n } from "@/i18n";
import { ReservationActions } from "@/features/reservations/components/ReservationActions";

interface ReservationTableProps {
  reservations: Reservation[];
  onRowClick: (reservationId: string) => void;
  onUpdated?: () => void;
  isLoading?: boolean;
}

function statusBadgeClasses(status: Reservation["status"]) {
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  if (status === "SEATED") return "bg-green-100 text-green-800 hover:bg-green-100";
  if (status === "COMPLETED") return "bg-zinc-200 text-zinc-800 hover:bg-zinc-200";
  if (status === "NO_SHOW") return "bg-orange-100 text-orange-800 hover:bg-orange-100";
  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function formatReservationTime(reservation: Reservation) {
  if (reservation.startAtUtc && reservation.timezone) {
    return formatInTimeZone(parseISO(reservation.startAtUtc), reservation.timezone, "HH:mm");
  }

  return reservation.time;
}

export function ReservationTable({
  reservations,
  onRowClick,
  onUpdated,
  isLoading = false
}: ReservationTableProps) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={`reservation-row-skeleton-${index}`} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-2">
        {reservations.map((reservation) => (
          <div key={reservation.id} className="w-full rounded-md border p-3 text-left">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {formatReservationTime(reservation)} - {reservation.guestName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {copy.party} {reservation.partySize}
                  {reservation.tableLabels?.length ? ` | ${reservation.tableLabels.join(", ")}` : ""}
                </p>
              </div>
              <Badge className={statusBadgeClasses(reservation.status)}>
                <span className="sr-only">{copy.status}: </span>
                {reservation.status}
              </Badge>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onRowClick(reservation.id)}>
                  {copy.view}
                </Button>
                <ReservationActions
                  reservation={reservation}
                  onViewDetails={onRowClick}
                  onUpdated={onUpdated}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{copy.time}</TableHead>
          <TableHead>{copy.guestName}</TableHead>
          <TableHead className="text-right">{copy.partySize}</TableHead>
          <TableHead>{copy.tables}</TableHead>
          <TableHead>{copy.status}</TableHead>
          <TableHead className="text-right">{copy.view}</TableHead>
          <TableHead className="text-right">{copy.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reservations.map((reservation) => (
          <TableRow key={reservation.id}>
            <TableCell className="font-medium">{formatReservationTime(reservation)}</TableCell>
            <TableCell>{reservation.guestName}</TableCell>
            <TableCell className="text-right font-semibold">{reservation.partySize}</TableCell>
            <TableCell>{reservation.tableLabels?.length ? reservation.tableLabels.join(", ") : "-"}</TableCell>
            <TableCell>
              <Badge className={statusBadgeClasses(reservation.status)}>
                <span className="sr-only">{copy.status}: </span>
                {reservation.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => onRowClick(reservation.id)}>
                {copy.view}
              </Button>
            </TableCell>
            <TableCell className="text-right">
              <div>
                <ReservationActions
                  reservation={reservation}
                  onViewDetails={onRowClick}
                  onUpdated={onUpdated}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const COPY = {
  en: {
    party: "Party",
    status: "Status",
    view: "View",
    time: "Time",
    guestName: "Guest Name",
    partySize: "Party Size",
    tables: "Table(s)",
    actions: "Actions"
  },
  nl: {
    party: "Groep",
    status: "Status",
    view: "Bekijk",
    time: "Tijd",
    guestName: "Gastnaam",
    partySize: "Groepsgrootte",
    tables: "Tafel(s)",
    actions: "Acties"
  },
  fr: {
    party: "Groupe",
    status: "Statut",
    view: "Voir",
    time: "Heure",
    guestName: "Nom du client",
    partySize: "Taille du groupe",
    tables: "Table(s)",
    actions: "Actions"
  },
  es: {
    party: "Grupo",
    status: "Estado",
    view: "Ver",
    time: "Hora",
    guestName: "Nombre del cliente",
    partySize: "Tamano del grupo",
    tables: "Mesa(s)",
    actions: "Acciones"
  }
} as const;
