import { Users } from "lucide-react";
import type { CSSProperties } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TimelineReservation } from "@/features/timeline/api";
import { useI18n } from "@/i18n";

interface TimelineReservationBlockProps {
  reservation: TimelineReservation;
  style: CSSProperties;
  onClick: (reservationId: string) => void;
}

function reservationColorClasses(status: TimelineReservation["status"]) {
  if (status === "CONFIRMED") return "bg-blue-500 text-white";
  if (status === "SEATED") return "bg-green-500 text-white";
  if (status === "COMPLETED") return "bg-gray-400 text-white";
  if (status === "NO_SHOW") return "bg-red-500 text-white";
  return "text-slate-800 line-through";
}

export function TimelineReservationBlock({ reservation, style, onClick }: TimelineReservationBlockProps) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const isCancelled = reservation.status === "CANCELLED";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onClick(reservation.id)}
          className={`absolute z-20 overflow-hidden rounded-md px-2 py-1 text-left text-xs shadow transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring ${reservationColorClasses(reservation.status)}`}
          style={{
            ...style,
            opacity: isCancelled ? 0.35 : 1,
            background: isCancelled
              ? "repeating-linear-gradient(-45deg, #94a3b8, #94a3b8 6px, #cbd5e1 6px, #cbd5e1 12px)"
              : undefined
          }}
        >
          <p className="truncate font-semibold">{reservation.guestName}</p>
          <p className="inline-flex items-center gap-1 truncate">
            <Users className="h-3 w-3" />
            {reservation.partySize}
          </p>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-semibold">{reservation.guestName}</p>
        <p>{copy.party} {reservation.partySize}</p>
        <p>
          {reservation.startTime} - {reservation.endTime}
        </p>
        <p>{copy.status} {reservation.status}</p>
        <p className="text-muted-foreground">{copy.clickToViewDetails}</p>
      </TooltipContent>
    </Tooltip>
  );
}

const COPY = {
  en: {
    party: "Party",
    status: "Status:",
    clickToViewDetails: "Click to view details"
  },
  nl: {
    party: "Groep",
    status: "Status:",
    clickToViewDetails: "Klik om details te bekijken"
  },
  fr: {
    party: "Groupe",
    status: "Statut :",
    clickToViewDetails: "Cliquez pour voir les details"
  },
  es: {
    party: "Grupo",
    status: "Estado:",
    clickToViewDetails: "Haz clic para ver detalles"
  }
} as const;
