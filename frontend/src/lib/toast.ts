import { createElement } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import type { ApiResponse, AppError } from "@/api/types";

type ToastKind = "success" | "error" | "warning" | "info";

function renderMessage(message: string, dismiss: () => void) {
  return createElement(
    "button",
    {
      type: "button",
      onClick: dismiss,
      className: "w-full cursor-pointer text-left"
    },
    message
  );
}

function show(kind: ToastKind, message: string, duration: number) {
  let toastId: string | number = "";
  const content = renderMessage(message, () => toast.dismiss(toastId));
  const options = {
    duration,
    dismissible: true,
    closeButton: true,
    ariaProps: { role: "alert", "aria-live": "assertive" as const }
  };

  if (kind === "success") {
    toastId = toast.success(content, options);
    return;
  }
  if (kind === "error") {
    toastId = toast.error(content, options);
    return;
  }
  if (kind === "warning") {
    toastId = toast.warning(content, options);
    return;
  }
  toastId = toast.info(content, options);
}

export function showSuccess(message: string) {
  show("success", message, 4000);
}

export function showError(message: string) {
  show("error", message, 6000);
}

export function showWarning(message: string) {
  show("warning", message, 5000);
}

export function showInfo(message: string) {
  show("info", message, 5000);
}

function parseAppError(error: unknown): { code?: string; field?: string; message?: string } {
  if (typeof error === "object" && error !== null && "code" in error) {
    const appError = error as AppError;
    return {
      code: typeof appError.code === "string" ? appError.code : undefined,
      field: appError.field,
      message: appError.message
    };
  }

  if (isAxiosError(error)) {
    const response = error.response?.data as ApiResponse<unknown> | undefined;
    return {
      code: response?.error?.code,
      field: response?.error?.field,
      message: response?.error?.message ?? response?.message ?? error.message
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return {};
}

export function showApiError(error: unknown) {
  const normalized = parseAppError(error);
  const code = (normalized.code ?? "").toUpperCase();

  if (code === "RATE_LIMITED") {
    showError("Too many requests. Please wait a moment.");
    return;
  }
  if (code === "CONFLICT") {
    if (normalized.field === "email") {
      showError("An account with this email already exists.");
      return;
    }
    if (normalized.field === "restaurantSlug") {
      showError("This booking URL slug is already taken. Please choose another.");
      return;
    }
    if (normalized.message && normalized.message.trim().length > 0) {
      showError(normalized.message);
      return;
    }
    showError("This resource was modified. Please refresh and try again.");
    return;
  }
  if (code === "VALIDATION_ERROR") {
    if (normalized.field && normalized.message) {
      showError(`${normalized.field}: ${normalized.message}`);
      return;
    }
    showError(normalized.message ?? "Please check the form values and try again.");
    return;
  }
  if (code === "NOT_FOUND") {
    showError("Resource not found");
    return;
  }
  if (code === "FORBIDDEN") {
    showError("You don't have permission for this action");
    return;
  }

  showError("Something went wrong. Please try again.");
}
