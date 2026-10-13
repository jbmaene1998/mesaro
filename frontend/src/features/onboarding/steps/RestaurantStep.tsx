import { useState } from "react";

import { createRestaurant } from "@/api/restaurants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sanitizeSlug, guessTimezone } from "@/features/auth/register-utils";
import type { WizardCopy } from "@/features/onboarding/wizardCopy";
import { showApiError } from "@/lib/toast";

interface RestaurantStepProps {
  copy: WizardCopy;
  hasRestaurant: boolean;
  restaurantName?: string;
  restaurantSlug?: string;
  onCreated: (restaurantId: string) => Promise<void>;
  onContinue: () => void;
}

export function RestaurantStep({
  copy,
  hasRestaurant,
  restaurantName,
  restaurantSlug,
  onCreated,
  onContinue
}: RestaurantStepProps) {
  const [name, setName] = useState(restaurantName ?? "");
  const [slug, setSlug] = useState(restaurantSlug ?? "");
  const [timezone, setTimezone] = useState(guessTimezone());
  const [locale, setLocale] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (hasRestaurant) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{copy.restaurantWhy}</p>
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{copy.restaurantExample}</p>
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">{restaurantName}</p>
          <p className="text-muted-foreground">/r/{restaurantSlug}</p>
        </div>
        <Button type="button" onClick={onContinue}>
          {copy.continue}
        </Button>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Restaurant name is required.");
      return;
    }
    if (!slug.trim() || sanitizeSlug(slug) !== slug.trim()) {
      setError("Use a valid booking URL slug (letters, numbers, hyphens only).");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const restaurant = await createRestaurant({
        name: name.trim(),
        slug: slug.trim(),
        timezone: timezone.trim() || guessTimezone(),
        locale,
        slotIntervalMinutes: 15,
        defaultDurationMinutes: 90,
        minNoticeMinutes: 0,
        maxAdvanceDays: 90,
        maxPartySize: 20,
        assignmentMode: "AUTO"
      });
      await onCreated(restaurant.id);
      onContinue();
    } catch (createError) {
      setError("We couldn't create your restaurant right now. Please try again.");
      showApiError(createError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{copy.restaurantWhy}</p>
      <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{copy.restaurantExample}</p>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="wiz-name">
          {copy.restaurantName}
        </label>
        <Input
          id="wiz-name"
          value={name}
          onChange={(event) => {
            const next = event.target.value;
            setName(next);
            setSlug(sanitizeSlug(next));
          }}
          placeholder="Northside Bistro"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="wiz-slug">
          {copy.restaurantSlug}
        </label>
        <Input
          id="wiz-slug"
          value={slug}
          onChange={(event) => setSlug(sanitizeSlug(event.target.value))}
          placeholder="northside-bistro"
        />
        <p className="text-xs text-muted-foreground">
          /r/{slug || "your-restaurant"}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="wiz-tz">
            {copy.restaurantTimezone}
          </label>
          <Input id="wiz-tz" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="wiz-locale">
            {copy.restaurantLocale}
          </label>
          <select
            id="wiz-locale"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            <option value="en">English</option>
            <option value="nl">Nederlands</option>
            <option value="fr">Francais</option>
            <option value="es">Espanol</option>
          </select>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" onClick={() => void handleCreate()} disabled={isSubmitting}>
        {isSubmitting ? copy.saving : copy.createRestaurant}
      </Button>
    </div>
  );
}
