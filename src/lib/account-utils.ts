export const accountFallback = "/account/";

/** Only local catalogue/account destinations are accepted, never arbitrary origins. */
export function safeNextPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return accountFallback;
  try {
    const url = new URL(value, "https://special.invalid");
    if (url.origin !== "https://special.invalid") return accountFallback;
    if (!/^\/(?:account\/?|styles(?:\/[a-z-]+)?\/?)$/.test(url.pathname))
      return accountFallback;
    // Auth pages would create a redirect loop; callbacks must have one exchange owner.
    if (url.pathname.startsWith("/account/")) return accountFallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return accountFallback;
  }
}

export function publicClientConfig(
  url: string | undefined,
  key: string | undefined,
): { url: string; key: string } | null {
  if (!url || !key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return null;
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (
      (parsed.protocol !== "https:" &&
        !(local && parsed.protocol === "http:")) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    )
      return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

export function validDisplayName(value: string): string | null {
  const name = value.trim();
  return name.length > 0 && Array.from(name).length <= 80 ? name : null;
}

/** User-editable metadata supplies presentation only, never account permissions. */
export function metadataDisplayName(value: unknown): string | null {
  return typeof value === "string" ? validDisplayName(value) : null;
}

export function authErrorMessage(
  error: { code?: string } | null | undefined,
): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "The email or password was not recognised. Try again or reset your password.";
    case "email_not_confirmed":
      return "Confirm your email first, then sign in.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a little before trying again.";
    case "weak_password":
      return "Choose a stronger password with at least 12 characters.";
    case "same_password":
      return "Choose a password different from your current password.";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
      return "This link expired or was opened in a different browser. Request a new link and open it in the browser where you started.";
    default:
      return "We could not complete that request. Check your connection and try again.";
  }
}
