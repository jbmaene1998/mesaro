import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteStaff } from "@/features/staff/api";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { showApiError, showSuccess } from "@/lib/toast";

interface StaffStepProps {
  copy: WizardCopy;
  onSaved: () => Promise<void>;
  onContinue: () => void;
  onSkip: () => void;
}

export function StaffStep({ copy, onSaved, onContinue, onSkip }: StaffStepProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"STAFF" | "MANAGER">("STAFF");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async () => {
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await inviteStaff(email.trim(), firstName.trim(), lastName.trim(), role);
      showSuccess(copy.inviteSent);
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
      <p className="text-sm text-muted-foreground">{copy.staffWhy}</p>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{copy.staffExample}</p>
      <p className="text-xs text-muted-foreground">{copy.staffOptional}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="wiz-staff-email">
            {copy.staffEmail}
          </label>
          <Input id="wiz-staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="wiz-staff-first">
            {copy.staffFirstName}
          </label>
          <Input id="wiz-staff-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="wiz-staff-last">
            {copy.staffLastName}
          </label>
          <Input id="wiz-staff-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="wiz-staff-role">
            {copy.staffRole}
          </label>
          <select
            id="wiz-staff-role"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as "STAFF" | "MANAGER")}
          >
            <option value="STAFF">{copy.roleStaff}</option>
            <option value="MANAGER">{copy.roleManager}</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void handleInvite()} disabled={isSubmitting}>
          {isSubmitting ? copy.saving : copy.sendInvite}
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip}>
          {copy.skip}
        </Button>
      </div>
    </div>
  );
}
