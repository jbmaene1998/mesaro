export function resolvePostLoginRedirect(returnUrl: string | null) {
  if (!returnUrl) {
    return "/dashboard";
  }

  const trimmed = returnUrl.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/dashboard";
  }

  if (trimmed.startsWith("/login")) {
    return "/dashboard";
  }

  return trimmed;
}
