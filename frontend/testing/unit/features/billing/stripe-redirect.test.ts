import { describe, expect, it } from "vitest";

import { stripeBillingRedirectUrl } from "@/features/billing/stripe-redirect";

describe("stripeBillingRedirectUrl", () => {
  it("allows Stripe checkout and billing portal", () => {
    expect(stripeBillingRedirectUrl("https://checkout.stripe.com/c/pay/cs_test_123")).toBe(
      "https://checkout.stripe.com/c/pay/cs_test_123"
    );
    expect(stripeBillingRedirectUrl("https://billing.stripe.com/p/session/test")).toBe(
      "https://billing.stripe.com/p/session/test"
    );
  });

  it("rejects other hosts and insecure URLs", () => {
    expect(stripeBillingRedirectUrl("https://evil.example/checkout")).toBeNull();
    expect(stripeBillingRedirectUrl("http://checkout.stripe.com/c/pay/cs_test")).toBeNull();
    expect(stripeBillingRedirectUrl("not a url")).toBeNull();
  });
});
