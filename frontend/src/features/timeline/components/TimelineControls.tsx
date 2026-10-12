import { addDays, format, isToday, parseISO, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { messages } from "@/i18n/messages";

interface TimelineControlsProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  slotMinutes: 15 | 30 | 60;
  onSlotMinutesChange: (slotMinutes: 15 | 30 | 60) => void;
  onScrollToNow: () => void;
}

const LEGEND_ITEMS = [
  { label: "Confirmed", className: "bg-blue-500 text-white" },
  { label: "Seated", className: "bg-green-500 text-white" },
  { label: "Completed", className: "bg-gray-400 text-white" },
  { label: "No-show", className: "bg-red-500 text-white" },
  { label: "Cancelled", className: "bg-slate-300 text-slate-700" }
];

function legendKey(label: string): keyof typeof messages.en {
  if (label === "Confirmed") return "timeline.legend.confirmed";
  if (label === "Seated") return "timeline.legend.seated";
  if (label === "Completed") return "timeline.legend.completed";
  if (label === "No-show") return "timeline.legend.noShow";
  return "timeline.legend.cancelled";
}

export function TimelineControls({
  selectedDate,
  onDateChange,
  slotMinutes,
  onSlotMinutesChange,
  onScrollToNow
}: TimelineControlsProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onDateChange(format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd"))}
            aria-label={t("timeline.previousDay")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm md:h-9"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onDateChange(format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd"))}
            aria-label={t("timeline.nextDay")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onDateChange(format(new Date(), "yyyy-MM-dd"))}
            disabled={isToday(parseISO(selectedDate))}
          >
            {t("timeline.today")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("timeline.zoom")}</span>
          {[15, 30, 60].map((minutes) => (
            <Button
              key={minutes}
              type="button"
              variant={slotMinutes === minutes ? "default" : "outline"}
              size="sm"
              onClick={() => onSlotMinutesChange(minutes as 15 | 30 | 60)}
            >
              {minutes}m
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={onScrollToNow}>
            {t("timeline.scrollToNow")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("timeline.legend")}</span>
        {LEGEND_ITEMS.map((item) => (
          <Badge key={item.label} className={item.className}>
            {t(legendKey(item.label))}
          </Badge>
        ))}
      </div>
    </div>
  );
}
