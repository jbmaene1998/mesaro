import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n";

interface CtaBannerProps {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
  ctaAnalyticsEvent?: string;
  onCtaClick?: () => void;
}

export function CtaBanner({
  title,
  description,
  ctaLabel,
  ctaTo = "/register",
  ctaAnalyticsEvent,
  onCtaClick
}: CtaBannerProps) {
  const { t } = useI18n();
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="max-w-2xl">
          <h3 className="text-2xl font-semibold sm:text-3xl">{title}</h3>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        <Button asChild className="sm:self-start">
          <Link to={ctaTo} data-analytics-event={ctaAnalyticsEvent} onClick={onCtaClick}>
            {ctaLabel ?? t("common.startNow")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
