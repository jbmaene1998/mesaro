import { Button } from "@/components/ui/button";
import { markShareStepSeen } from "@/features/onboarding/hooks/useOnboardingStatus";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { showSuccess } from "@/lib/toast";

interface ShareStepProps {
  copy: WizardCopy;
  restaurantId: string;
  slug: string;
  onContinue: () => void;
}

async function copyText(value: string, successMessage: string) {
  await navigator.clipboard.writeText(value);
  showSuccess(successMessage);
}

export function ShareStep({ copy, restaurantId, slug, onContinue }: ShareStepProps) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const bookingUrl = `${origin}/r/${slug}`;
  const embed = `<iframe src="${origin}/embed/${slug}" title="Book a table" width="100%" height="760" style="border:0;border-radius:12px;"></iframe>`;

  const finish = () => {
    markShareStepSeen(restaurantId);
    onContinue();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{copy.shareWhy}</p>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{copy.shareExample}</p>
      <div className="rounded-md border p-3 text-sm break-all">{bookingUrl}</div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(bookingUrl, copy.linkCopied)}>
          {copy.copyLink}
        </Button>
        <Button type="button" variant="outline" onClick={() => void copyText(embed, copy.embedCopied)}>
          {copy.copyEmbed}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <a href={bookingUrl} target="_blank" rel="noreferrer">
            {copy.openBookingPage}
          </a>
        </Button>
      </div>
      <Button type="button" onClick={finish}>
        {copy.continue}
      </Button>
    </div>
  );
}
