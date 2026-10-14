function toBase64Url(value: object): string {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/** Unsigned JWT — frontend only base64-decodes the payload (no signature check). */
export function mintAccessToken(overrides: Record<string, unknown> = {}): string {
  const payload = {
    sub: "e2e-user",
    userId: 9001,
    email: "e2e.norestaurants@example.com",
    restaurants: [] as unknown[],
    maxRestaurants: 3,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  };
  return `${toBase64Url({ alg: "none", typ: "JWT" })}.${toBase64Url(payload)}.e2e`;
}
