import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";

export interface PricingComparisonRow {
  feature: string;
  plan: string;
}

interface PricingComparisonTableProps {
  rows: PricingComparisonRow[];
}

export function PricingComparisonTable({ rows }: PricingComparisonTableProps) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold sm:px-5">{copy.capability}</th>
              <th className="px-4 py-3 font-semibold sm:px-5">{copy.onePlan}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-t">
                <td className="px-4 py-3 font-medium sm:px-5">{row.feature}</td>
                <td className="px-4 py-3 text-muted-foreground sm:px-5">{row.plan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const COPY = {
  en: {
    capability: "Capability",
    onePlan: "1 plan"
  },
  nl: {
    capability: "Mogelijkheid",
    onePlan: "1 plan"
  },
  fr: {
    capability: "Capacite",
    onePlan: "1 plan"
  },
  es: {
    capability: "Capacidad",
    onePlan: "1 plan"
  }
} as const;
