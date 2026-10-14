const STRIPE_BILLING_HOSTS = new Set(["checkout.stripe.com", "billing.stripe.com"]);

/** Returns the URL when it is an https Stripe Checkout or Customer Portal link. */
export function stripeBillingRedirectUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") {
    return null;
  }
  if (!STRIPE_BILLING_HOSTS.has(url.hostname)) {
    return null;
  }
  return url.toString();
}
