import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AvailabilitySlot } from "@/features/booking/api";
import { useI18n } from "@/i18n";

interface TimeSlotGridProps {
  slots: AvailabilitySlot[];
  onSelect: (slot: AvailabilitySlot) => void;
  isLoading: boolean;
}

function groupByShift(slots: AvailabilitySlot[]) {
  const grouped = new Map<string, AvailabilitySlot[]>();

  for (const slot of slots) {
    const shift = slot.shift || "General";
    const existing = grouped.get(shift) ?? [];
    existing.push(slot);
    grouped.set(shift, existing);
  }

  return grouped;
}

export function TimeSlotGrid({ slots, onSelect, isLoading }: TimeSlotGridProps) {
  const { locale } = useI18n();
  const copy = COPY[locale as keyof typeof COPY];
  const grouped = groupByShift(slots);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([shift, shiftSlots]) => (
        <section key={shift} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{shift}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {shiftSlots.map((slot) => (
              <Button
                key={`${shift}-${slot.time}`}
                type="button"
                variant={slot.available ? "default" : "outline"}
                disabled={!slot.available || isLoading}
                onClick={() => onSelect(slot)}
                className="w-full justify-between"
                aria-label={`${slot.displayTime} ${slot.available ? copy.availableLower : copy.fullLower} ${copy.forShift} ${shift}`}
                aria-disabled={!slot.available || isLoading}
              >
                <span>{slot.displayTime}</span>
                {!slot.available ? (
                  <Badge variant="secondary" className="ml-2">
                    {copy.full}
                  </Badge>
                ) : null}
              </Button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const COPY = {
  en: {
    availableLower: "available",
    fullLower: "full",
    forShift: "for",
    full: "Full"
  },
  nl: {
    availableLower: "beschikbaar",
    fullLower: "vol",
    forShift: "voor",
    full: "Vol"
  },
  fr: {
    availableLower: "disponible",
    fullLower: "complet",
    forShift: "pour",
    full: "Complet"
  },
  es: {
    availableLower: "disponible",
    fullLower: "completo",
    forShift: "para",
    full: "Completo"
  }
} as const;
