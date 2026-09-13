import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const OTP_LENGTH = 6;
export const OTP_VALIDITY_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

// HMAC (not a plain hash) so a raw database read alone doesn't hand over
// enough to brute-force offline — the server secret is also required.
// A fast primitive is fine here: brute-force resistance for a 6-digit code
// comes from OTP_MAX_ATTEMPTS + expiry, the same way it would for any OTP
// system, not from making each guess computationally expensive.
function getOtpSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable");
  }
  return secret;
}

export function hashOtpCode(code: string): string {
  return createHmac("sha256", getOtpSecret()).update(code).digest("hex");
}

export function verifyOtpCode(code: string, hash: string): boolean {
  const candidate = Buffer.from(hashOtpCode(code), "hex");
  const stored = Buffer.from(hash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}
