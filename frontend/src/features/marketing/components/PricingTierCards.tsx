import { Check } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n";

export interface PricingTier {
  name: string;
  monthlyPrice: string;
  description: string;
  highlights: string[];
  featured?: boolean;
}

interface PricingTierCardsProps {
  tiers: PricingTier[];
}

export function PricingTierCards({ tiers }: PricingTierCardsProps) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {tiers.map((tier) => (
        <Card key={tier.name} className={tier.featured ? "border-primary/50 shadow-sm" : ""}>
          <CardHeader>
            <CardTitle className="text-xl">{tier.name}</CardTitle>
            <p className="text-3xl font-semibold">{tier.monthlyPrice}</p>
            <p className="text-sm text-muted-foreground">{tier.description}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-3">
              {tier.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="w-full" variant={tier.featured ? "default" : "outline"}>
              <Link to="/register">{t("common.startNow")}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
