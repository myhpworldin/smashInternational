import "server-only";
import { randomInt } from "crypto";

// Ambiguous characters (i, l, o, 0, 1, etc.) left out so a password read
// aloud or copied off a screen can't be misread.
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function pick(charset: string): string {
  return charset[randomInt(charset.length)];
}

// Generates a temporary password for an admin-created account: drawn from
// Node's CSPRNG (crypto.randomInt), independent of any user-supplied
// data, and always containing at least one lower/upper/digit/symbol so it
// satisfies the existing 8–200 char password policy (shared/validation/auth.ts)
// with room to spare. It only ever exists in memory for the one response
// that returns it — see createUserByAdmin in adminUsers.service.ts.
export function generateTempPassword(length = 14): string {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: Math.max(length - required.length, 0) }, () => pick(ALL));
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
