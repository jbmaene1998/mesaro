import { isAxiosError } from "axios";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function guessTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function sanitizeSlug(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function getSignupErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Could not reach the server. Check your connection (and that the staging certificate is trusted), then try again.";
    }
    if (error.response.status === 409) {
      const field = (error.response.data as { error?: { field?: string } })?.error?.field;
      if (field === "email") {
        return "An account with this email already exists.";
      }
      if (field === "restaurantSlug") {
        return "This booking URL slug is already taken. Please choose another.";
      }
      return "Account setup conflict. Please review your details.";
    }
  }

  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: number }).status;
    if (status === 0) {
      return "Could not reach the server. Check your connection (and that the staging certificate is trusted), then try again.";
    }
    if (status === 409) {
      const field = (error as { field?: string }).field;
      if (field === "email") {
        return "An account with this email already exists.";
      }
      if (field === "restaurantSlug") {
        return "This booking URL slug is already taken. Please choose another.";
      }
      return "Account setup conflict. Please review your details.";
    }
  }

  return "We couldn't create your account right now. Please try again.";
}

