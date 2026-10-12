import type { VacationStatus } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";

interface VacationStatusBadgeProps {
  status: VacationStatus;
}

function statusClass(status: VacationStatus) {
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "APPROVED") return "bg-green-100 text-green-800";
  return "bg-red-100 text-red-800";
}

export function VacationStatusBadge({ status }: VacationStatusBadgeProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const label = status === "PENDING" ? copy.pending : status === "APPROVED" ? copy.approved : copy.rejected;
  return <Badge className={statusClass(status)}>{label}</Badge>;
}

const COPY = {
  en: {
    pending: "PENDING",
    approved: "APPROVED",
    rejected: "REJECTED"
  },
  nl: {
    pending: "IN AFWACHTING",
    approved: "GOEDGEKEURD",
    rejected: "AFGEWEZEN"
  },
  fr: {
    pending: "EN ATTENTE",
    approved: "APPROUVE",
    rejected: "REJETE"
  },
  es: {
    pending: "PENDIENTE",
    approved: "APROBADO",
    rejected: "RECHAZADO"
  }
} as const;
