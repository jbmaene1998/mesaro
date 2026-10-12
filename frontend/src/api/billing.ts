import { apiClient } from './client';
import type { ApiResponse, AppError } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'PAUSED';

export interface BillingStatusResponse {
  status: SubscriptionStatus;
  trialEndsAt: string | null;       // ISO-8601 UTC
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  accessAllowed: boolean;
  currentQuantity: number;
  activeRestaurantCount: number;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

function unwrapResponse<T>(response: ApiResponse<T>) {
  if (response.success && response.data !== null) {
    return response.data;
  }

  const appError: AppError = {
    status: 400,
    code: response.error?.code ?? 'UNKNOWN',
    message: response.error?.message ?? response.message ?? 'Request failed',
    field: response.error?.field,
    timestamp: response.timestamp,
  };

  throw appError;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const billingApi = {
  /**
   * Returns the current billing status for the given restaurant.
   */
  getStatus: async (restaurantId: string | number): Promise<BillingStatusResponse> => {
    const res = await apiClient.get<ApiResponse<BillingStatusResponse>>(
      `/restaurants/${restaurantId}/billing/status`,
    );
    return unwrapResponse(res.data);
  },

  /**
   * Creates a Stripe Checkout Session for subscription sign-up.
   * Redirect the browser to the returned URL immediately.
   *
   * @example
   * const { url } = await billingApi.createCheckoutSession(restaurantId);
   * window.location.href = url;
   */
  createCheckoutSession: async (restaurantId: string | number): Promise<CheckoutSessionResponse> => {
    const res = await apiClient.post<ApiResponse<CheckoutSessionResponse>>(
      `/restaurants/${restaurantId}/billing/checkout-session`,
    );
    return unwrapResponse(res.data);
  },

  /**
   * Creates a Stripe Billing Portal session for self-service management.
   * Redirect the browser to the returned URL immediately.
   *
   * @example
   * const { url } = await billingApi.createPortalSession(restaurantId);
   * window.location.href = url;
   */
  createPortalSession: async (restaurantId: string | number): Promise<PortalSessionResponse> => {
    const res = await apiClient.post<ApiResponse<PortalSessionResponse>>(
      `/restaurants/${restaurantId}/billing/portal-session`,
    );
    return unwrapResponse(res.data);
  },

  /**
   * Updates Stripe subscription quantity (restaurant capacity) for the owner.
   */
  updateQuantity: async (
    restaurantId: string | number,
    quantity: number,
  ): Promise<BillingStatusResponse> => {
    const res = await apiClient.post<ApiResponse<BillingStatusResponse>>(
      `/restaurants/${restaurantId}/billing/quantity`,
      { quantity },
    );
    return unwrapResponse(res.data);
  },

  /**
   * Confirms a Stripe Checkout session after redirect (webhook fallback).
   */
  confirmCheckout: async (sessionId: string): Promise<void> => {
    const res = await apiClient.post<ApiResponse<null>>(
      `/billing/checkout/confirm`,
      null,
      { params: { session_id: sessionId } },
    );
    if (!res.data.success) {
      unwrapResponse(res.data);
    }
  },
};
