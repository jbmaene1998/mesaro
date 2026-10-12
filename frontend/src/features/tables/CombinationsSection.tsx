import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useState } from "react";

import type { DiningTable, TableCombination } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useSelectedRestaurantId } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { getCombinations } from "@/features/tables/api";
import { CombinationFormDialog } from "@/features/tables/components/CombinationFormDialog";

interface CombinationsSectionProps {
  tables: DiningTable[];
}

export function CombinationsSection({ tables }: CombinationsSectionProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const selectedRestaurantId = useSelectedRestaurantId();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState<TableCombination | null>(null);
  const [startDelete, setStartDelete] = useState(false);

  const combinationsQuery = useQuery({
    queryKey: ["table-combinations", selectedRestaurantId],
    queryFn: getCombinations,
    enabled: Boolean(selectedRestaurantId)
  });

  const combinations = combinationsQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{copy.combinations}</CardTitle>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => {
            setSelectedCombination(null);
            setStartDelete(false);
            setOpenDialog(true);
          }}
        >
          <PlusCircle className="h-4 w-4" />
          {copy.addCombination}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {combinationsQuery.isLoading ? <TableSkeleton rows={3} /> : null}

        {combinationsQuery.isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{copy.unableToLoad}</p>
            <Button variant="outline" size="sm" onClick={() => void combinationsQuery.refetch()}>
              {copy.retry}
            </Button>
          </div>
        ) : null}

        {!combinationsQuery.isLoading && !combinationsQuery.isError && combinations.length === 0 ? (
          <EmptyState
            title={copy.noCombinations}
            description={copy.combineForLargeParties}
            actionLabel={copy.addCombinationLower}
            onAction={() => {
              setSelectedCombination(null);
              setStartDelete(false);
              setOpenDialog(true);
            }}
          />
        ) : null}

        {!combinationsQuery.isError && combinations.map((combination) => (
          <div key={combination.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{combination.name}</p>
                <p className="text-sm text-muted-foreground">
                  {combination.minCapacity}-{combination.maxCapacity} {copy.guests}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`${copy.actionsFor} ${combination.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCombination(combination);
                      setStartDelete(false);
                      setOpenDialog(true);
                    }}
                  >
                    {copy.edit}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCombination(combination);
                      setStartDelete(true);
                      setOpenDialog(true);
                    }}
                  >
                    {copy.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {combination.tables.map((table) => (
                <Badge key={`${combination.id}-${table.id}`} className="bg-slate-100 text-slate-700">
                  {table.label}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>

      <CombinationFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        tables={tables}
        combination={selectedCombination}
        startInDeleteConfirm={startDelete}
      />
    </Card>
  );
}

const COPY = {
  en: {
    combinations: "Combinations",
    addCombination: "Add Combination",
    unableToLoad: "Unable to load combinations.",
    retry: "Retry",
    noCombinations: "No table combinations configured",
    combineForLargeParties: "Combine tables to seat larger parties.",
    addCombinationLower: "Add combination",
    guests: "guests",
    actionsFor: "Actions for combination",
    edit: "Edit",
    delete: "Delete"
  },
  nl: {
    combinations: "Combinaties",
    addCombination: "Combinatie toevoegen",
    unableToLoad: "Kan combinaties niet laden.",
    retry: "Opnieuw",
    noCombinations: "Geen tafelcombinaties ingesteld",
    combineForLargeParties: "Combineer tafels voor grotere groepen.",
    addCombinationLower: "Combinatie toevoegen",
    guests: "gasten",
    actionsFor: "Acties voor combinatie",
    edit: "Bewerken",
    delete: "Verwijderen"
  },
  fr: {
    combinations: "Combinaisons",
    addCombination: "Ajouter une combinaison",
    unableToLoad: "Impossible de charger les combinaisons.",
    retry: "Reessayer",
    noCombinations: "Aucune combinaison de table configuree",
    combineForLargeParties: "Combinez des tables pour les grands groupes.",
    addCombinationLower: "Ajouter une combinaison",
    guests: "clients",
    actionsFor: "Actions pour la combinaison",
    edit: "Modifier",
    delete: "Supprimer"
  },
  es: {
    combinations: "Combinaciones",
    addCombination: "Agregar combinacion",
    unableToLoad: "No se pueden cargar combinaciones.",
    retry: "Reintentar",
    noCombinations: "No hay combinaciones de mesas configuradas",
    combineForLargeParties: "Combina mesas para grupos grandes.",
    addCombinationLower: "Agregar combinacion",
    guests: "personas",
    actionsFor: "Acciones para combinacion",
    edit: "Editar",
    delete: "Eliminar"
  }
} as const;
