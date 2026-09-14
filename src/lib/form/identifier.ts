// The real backend (see src/server/services/auth.service.ts) only
// authenticates by email — neither password nor OTP login has a phone
// number to check against, since UserDoc has no phone field. Login's
// identifier field is email-only for exactly that reason; looksLikePhone
// exists only so a phone-shaped entry can be told apart from a merely
// malformed email, to give a more specific, honest rejection message
// instead of pretending either login method would accept it.
const PHONE_PATTERN = /^[+\d][\d\s\-()]{6,19}$/;

export function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

export function looksLikePhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}

// Shared by both login methods (see ClientLoginForm) so a phone-shaped
// identifier gets the exact same honest rejection regardless of which
// method is selected — never a message that implies switching methods
// would help, since neither supports a mobile number.
export function identifierError(value: string): string | null {
  const trimmed = value.trim();
  if (looksLikeEmail(trimmed)) return null;
  return looksLikePhone(trimmed)
    ? "Mobile number sign-in isn't available yet — enter your email address instead."
    : "Enter a valid email address.";
}
