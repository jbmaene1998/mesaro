import { useState } from "react";

import { Button } from "@/components/ui/button";
import { updateRestaurant } from "@/features/settings/api";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { showApiError, showSuccess } from "@/lib/toast";

interface BookingStepProps {
  copy: WizardCopy;
  bookingEnabled: boolean;
  canEnable: boolean;
  onSaved: () => Promise<void>;
  onContinue: () => void;
}

export function BookingStep({
  copy,
  bookingEnabled,
  canEnable,
  onSaved,
  onContinue
}: BookingStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEnable = async () => {
    if (bookingEnabled) {
      onContinue();
      return;
    }
    if (!canEnable) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateRestaurant({ bookingEnabled: true });
      showSuccess(copy.bookingEnabled);
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
      <p className="text-sm text-muted-foreground">{copy.bookingWhy}</p>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{copy.bookingExample}</p>
      {bookingEnabled ? (
        <p className="text-sm font-medium text-green-700">{copy.bookingEnabled}</p>
      ) : !canEnable ? (
        <p className="text-sm text-destructive">{copy.bookingBlocked}</p>
      ) : null}
      <Button
        type="button"
        onClick={() => void handleEnable()}
        disabled={isSubmitting || (!bookingEnabled && !canEnable)}
      >
        {isSubmitting ? copy.saving : bookingEnabled ? copy.continue : copy.enableBooking}
      </Button>
    </div>
  );
}
