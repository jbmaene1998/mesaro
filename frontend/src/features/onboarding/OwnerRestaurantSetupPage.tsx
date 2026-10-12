import { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { createRestaurant } from "@/api/restaurants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { sanitizeSlug, guessTimezone } from "@/features/auth/register-utils";
import { RestaurantContext } from "@/stores/restaurant-context";
import { showApiError } from "@/lib/toast";

const TRIAL_STARTED_FLAG_PREFIX = "mesaro.trial.started.";

export function OwnerRestaurantSetupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, restaurants, silentRefresh } = useAuth();
  const restaurantContext = useContext(RestaurantContext);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState(guessTimezone());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (restaurants.length > 0) {
    return <Navigate to="/dashboard" replace />;
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
    if (!timezone.trim()) {
      setError("Timezone is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const restaurant = await createRestaurant({
        name: name.trim(),
        slug: slug.trim(),
        timezone: timezone.trim(),
        locale: "en",
        slotIntervalMinutes: 15,
        defaultDurationMinutes: 90,
        minNoticeMinutes: 0,
        maxAdvanceDays: 90,
        maxPartySize: 20,
        assignmentMode: "AUTO"
      });
      sessionStorage.setItem(`${TRIAL_STARTED_FLAG_PREFIX}${restaurant.id}`, "1");
      await silentRefresh();
      await restaurantContext?.refreshContext();
      navigate("/dashboard", { replace: true });
    } catch (createError) {
      setError("We couldn't create your restaurant right now. Please try again.");
      showApiError(createError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[640px] p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Set up your first restaurant</CardTitle>
          <CardDescription>Create your first location to start using the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="onboarding-restaurant-name" className="text-sm font-medium">Restaurant name</label>
            <Input
              id="onboarding-restaurant-name"
              value={name}
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                setSlug(sanitizeSlug(nextName));
              }}
              placeholder="Northside Bistro"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="onboarding-restaurant-slug" className="text-sm font-medium">Booking URL slug</label>
            <Input
              id="onboarding-restaurant-slug"
              value={slug}
              onChange={(event) => setSlug(sanitizeSlug(event.target.value))}
              placeholder="northside-bistro"
            />
            <p className="text-xs text-muted-foreground">
              Booking URL preview: <span className="font-medium">/r/{slug || "your-restaurant"}</span>
            </p>
          </div>
          <div className="space-y-1">
            <label htmlFor="onboarding-timezone" className="text-sm font-medium">Timezone</label>
            <Input
              id="onboarding-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Europe/Brussels"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="button" onClick={() => void handleCreate()} disabled={isSubmitting}>
            {isSubmitting ? "Creating restaurant..." : "Create restaurant"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
