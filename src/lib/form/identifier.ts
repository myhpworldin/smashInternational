// Lets a single "Email / Mobile" field figure out which one was typed —
// the documented login concept accepts either, without separate tabs for
// each. The real backend (see src/server/services/auth.service.ts) only
// authenticates by email today; mobile-number login has no backend yet,
// which the login form surfaces as an explicit limitation rather than
// pretending to support it.
const PHONE_PATTERN = /^[+\d][\d\s\-()]{6,19}$/;

export function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

export function looksLikePhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}
