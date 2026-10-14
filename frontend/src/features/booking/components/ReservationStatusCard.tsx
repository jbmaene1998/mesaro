import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GuestReservation } from "@/features/booking/api";
import { useI18n } from "@/i18n";

interface ReservationStatusCardProps {
  reservation: GuestReservation;
}

function statusBadgeClasses(status: GuestReservation["status"]) {
  if (status === "CONFIRMED") return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  if (status === "SEATED") return "bg-green-100 text-green-800 hover:bg-green-100";
  if (status === "COMPLETED") return "bg-zinc-200 text-zinc-800 hover:bg-zinc-200";
  if (status === "CANCELLED") return "bg-red-100 text-red-800 hover:bg-red-100";
  return "bg-orange-100 text-orange-800 hover:bg-orange-100";
}

function formatReservationDateTime(reservation: GuestReservation) {
  const timeValue = reservation.time.length === 5 ? `${reservation.time}:00` : reservation.time;
  try {
    const local = new Date(`${reservation.date}T${timeValue}`);
    return formatInTimeZone(local, reservation.timezone, "PPP p zzz");
  } catch {
    // Fall through to basic format
  }

  return `${format(new Date(`${reservation.date}T00:00:00`), "PPP")} ${reservation.time}`;
}

export function ReservationStatusCard({ reservation }: ReservationStatusCardProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const isCancelled = reservation.status === "CANCELLED";

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">{copy.reservation}</CardTitle>
          <Badge className={statusBadgeClasses(reservation.status)}>
            <span className="sr-only">{copy.statusSr} </span>
            {reservation.status}
          </Badge>
        </div>
        <p className="text-2xl font-bold tracking-wider">{reservation.confirmationCode}</p>
      </CardHeader>
      <CardContent className={isCancelled ? "space-y-2 text-muted-foreground line-through" : "space-y-2"}>
        <p><span className="font-medium">{copy.dateTime}</span> {formatReservationDateTime(reservation)}</p>
        <p><span className="font-medium">{copy.partySize}</span> {reservation.partySize}</p>
        <p><span className="font-medium">{copy.shift}</span> {reservation.shiftName ?? copy.general}</p>
      </CardContent>
    </Card>
  );
}

const COPY = {
  en: {
    reservation: "Reservation",
    statusSr: "Status:",
    dateTime: "Date & Time:",
    partySize: "Party Size:",
    shift: "Shift:",
    general: "General"
  },
  nl: {
    reservation: "Reservering",
    statusSr: "Status:",
    dateTime: "Datum en tijd:",
    partySize: "Groepsgrootte:",
    shift: "Shift:",
    general: "Algemeen"
  },
  fr: {
    reservation: "Reservation",
    statusSr: "Statut :",
    dateTime: "Date et heure :",
    partySize: "Taille du groupe :",
    shift: "Service :",
    general: "General"
  },
  es: {
    reservation: "Reserva",
    statusSr: "Estado:",
    dateTime: "Fecha y hora:",
    partySize: "Tamano del grupo:",
    shift: "Turno:",
    general: "General"
  }
} as const;
