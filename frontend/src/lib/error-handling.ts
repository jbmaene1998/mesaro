import { isAxiosError } from "axios";
import { showApiError } from "@/lib/toast";

import type { ApiResponse, AppError } from "@/api/types";

function isAppError(error: unknown): error is AppError {
  return typeof error === "object" && error !== null && "status" in error && "message" in error;
}

function parseRetryAfter(rawValue: unknown) {
  if (!rawValue) {
    return undefined;
  }

  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.floor(seconds));
  }

  const dateValue = new Date(String(value)).getTime();
  if (Number.isNaN(dateValue)) {
    return undefined;
  }

  const delta = Math.ceil((dateValue - Date.now()) / 1000);
  return delta > 0 ? delta : 0;
}

export function getRetryAfter(error: unknown) {
  if (isAppError(error)) {
    return error.retryAfterSeconds;
  }

  if (isAxiosError(error)) {
    return parseRetryAfter(error.response?.headers?.["retry-after"]);
  }

  return undefined;
}

export function isConflictError(error: unknown) {
  if (isAppError(error)) {
    return error.status === 409;
  }

  return isAxiosError(error) && error.response?.status === 409;
}

export function isRateLimited(error: unknown) {
  if (isAppError(error)) {
    return error.status === 429;
  }

  return isAxiosError(error) && error.response?.status === 429;
}

export function formatApiError(error: unknown) {
  if (isConflictError(error)) {
    return "This resource was modified by someone else";
  }

  if (isRateLimited(error)) {
    const retryAfter = getRetryAfter(error);
    return typeof retryAfter === "number" && retryAfter > 0
      ? `Too many requests, please wait ${retryAfter} seconds`
      : "Too many requests, please wait";
  }

  if (isAppError(error)) {
    return error.message;
  }

  if (isAxiosError(error)) {
    const response = error.response?.data as ApiResponse<unknown> | undefined;
    return response?.error?.message ?? response?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function showErrorToast(error: unknown) {
  showApiError(error);
}
