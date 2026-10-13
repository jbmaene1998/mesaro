import { MoreHorizontal, Users } from "lucide-react";

import type { DiningTable } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { TableStatus } from "@/features/tables/api";
import { displayTableArea } from "@/features/tables/tableArea";
import { useI18n } from "@/i18n";

interface TableCardProps {
  table: DiningTable;
  liveStatus?: TableStatus;
  onEdit?: (table: DiningTable) => void;
  onDelete?: (table: DiningTable) => void;
  readOnly?: boolean;
}

function borderClass(status?: TableStatus["status"]) {
  if (status === "AVAILABLE") return "border-emerald-500";
  if (status === "UNAVAILABLE") return "border-rose-500";
  if (status) return "border-amber-400";
  return "border-border";
}

function dotClass(status?: TableStatus["status"]) {
  if (status === "AVAILABLE") return "bg-emerald-600";
  if (status === "UNAVAILABLE") return "bg-rose-600";
  if (status) return "bg-amber-500";
  return "bg-slate-400";
}

function statusLabel(status: string | undefined, copy: Copy) {
  if (!status) return copy.unknown;
  if (status === "UNAVAILABLE") return copy.unavailable;
  if (status === "AVAILABLE") return copy.available;
  if (status === "OCCUPIED") return copy.occupied;
  return status;
}

export function TableCard({ table, liveStatus, onEdit, onDelete, readOnly = false }: TableCardProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const effectiveStatus = liveStatus?.status ?? table.status;
  const isOccupied = effectiveStatus === "OCCUPIED";

  return (
    <div className={`group rounded-lg border p-4 shadow-sm ${borderClass(effectiveStatus)}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold">{table.label}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {table.seats} {copy.seats}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{displayTableArea(table.area)}</p>
        </div>

        {!readOnly && !isOccupied ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${copy.editOrDelete} ${table.label}`}
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit?.(table);
                }}
              >
                {copy.edit}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete?.(table);
                }}
              >
                {copy.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass(effectiveStatus)}`} />
        <span className="text-xs text-muted-foreground">{statusLabel(effectiveStatus, copy)}</span>
      </div>

      {liveStatus?.reservation ? (
        <div className="mt-2">
          <Badge className="bg-amber-100 text-amber-900">
            {liveStatus.reservation.guestName} {copy.until} {liveStatus.reservation.endTime}
          </Badge>
        </div>
      ) : null}

      {!readOnly ? (
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(table)}
            disabled={isOccupied}
            title={isOccupied ? copy.occupiedCannotEdit : undefined}
          >
            {copy.edit}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const COPY = {
  en: {
    seats: "seats",
    editOrDelete: "Edit or delete table",
    edit: "Edit",
    delete: "Delete",
    until: "until",
    unknown: "UNKNOWN",
    unavailable: "Unavailable",
    available: "Available",
    occupied: "Occupied",
    occupiedCannotEdit: "Table is currently occupied and cannot be edited"
  },
  nl: {
    seats: "zitplaatsen",
    editOrDelete: "Bewerk of verwijder tafel",
    edit: "Bewerken",
    delete: "Verwijderen",
    until: "tot",
    unknown: "ONBEKEND",
    unavailable: "Niet beschikbaar",
    available: "Beschikbaar",
    occupied: "Bezet",
    occupiedCannotEdit: "Tafel is momenteel bezet en kan niet worden bewerkt"
  },
  fr: {
    seats: "places",
    editOrDelete: "Modifier ou supprimer la table",
    edit: "Modifier",
    delete: "Supprimer",
    until: "jusqu a",
    unknown: "INCONNU",
    unavailable: "Indisponible",
    available: "Disponible",
    occupied: "Occupe",
    occupiedCannotEdit: "La table est actuellement occupee et ne peut pas etre modifiee"
  },
  es: {
    seats: "asientos",
    editOrDelete: "Editar o eliminar mesa",
    edit: "Editar",
    delete: "Eliminar",
    until: "hasta",
    unknown: "DESCONOCIDO",
    unavailable: "No disponible",
    available: "Disponible",
    occupied: "Ocupada",
    occupiedCannotEdit: "La mesa esta actualmente ocupada y no se puede editar"
  }
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];
