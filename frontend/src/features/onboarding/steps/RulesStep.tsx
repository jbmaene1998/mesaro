import { useState } from "react";

import type { RestaurantSummary } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRestaurant } from "@/features/settings/api";
import { markRulesStepSeen } from "@/features/onboarding/hooks/useOnboardingStatus";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { showApiError, showSuccess } from "@/lib/toast";

interface RulesStepProps {
  copy: WizardCopy;
  restaurantId: string;
  restaurant?: RestaurantSummary;
  onSaved: () => Promise<void>;
  onContinue: () => void;
}

export function RulesStep({ copy, restaurantId, restaurant, onSaved, onContinue }: RulesStepProps) {
  const [duration, setDuration] = useState(String(restaurant?.defaultDurationMinutes ?? 90));
  const [partySize, setPartySize] = useState(String(restaurant?.maxPartySize ?? 20));
  const [minNotice, setMinNotice] = useState(String(restaurant?.minNoticeMinutes ?? 0));
  const [maxAdvance, setMaxAdvance] = useState(String(restaurant?.maxAdvanceDays ?? 90));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateRestaurant({
        defaultDurationMinutes: Number(duration) || 90,
        maxPartySize: Number(partySize) || 20,
        minNoticeMinutes: Number(minNotice) || 0,
        maxAdvanceDays: Number(maxAdvance) || 90,
        assignmentMode: "AUTO"
      });
      markRulesStepSeen(restaurantId);
      showSuccess(copy.rulesSaved);
      await onSaved();
      onContinue();
    } catch (error) {
      showApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{copy.rulesWhy}</p>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{copy.rulesExample}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="wiz-duration">
            {copy.duration}
          </label>
          <Input id="wiz-duration" type="number" min={30} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="wiz-party">
            {copy.partySize}
          </label>
          <Input id="wiz-party" type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="wiz-notice">
            {copy.minNotice}
          </label>
          <Input id="wiz-notice" type="number" min={0} value={minNotice} onChange={(e) => setMinNotice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="wiz-advance">
            {copy.maxAdvance}
          </label>
          <Input id="wiz-advance" type="number" min={1} value={maxAdvance} onChange={(e) => setMaxAdvance(e.target.value)} />
        </div>
      </div>
      <Button type="button" onClick={() => void handleSave()} disabled={isSubmitting}>
        {isSubmitting ? copy.saving : copy.saveRules}
      </Button>
    </div>
  );
}
