import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subLabel?: string;
  warning?: boolean;
  progress?: {
    value: number;
    max: number;
  };
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subLabel,
  warning = false,
  progress
}: StatCardProps) {
  const progressPercent = progress && progress.max > 0
    ? Math.min(100, Math.round((progress.value / progress.max) * 100))
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${warning ? "text-orange-600" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent className="space-y-2">
        <p className={`text-2xl font-bold ${warning ? "text-orange-700" : ""}`}>{value}</p>
        {subLabel ? <p className="text-xs text-muted-foreground">{subLabel}</p> : null}
        {progress ? (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${warning ? "bg-orange-500" : "bg-primary"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress.value}/{progress.max}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
