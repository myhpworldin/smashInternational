import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role, SessionPayload } from "@/shared/types/user";

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Read lazily, on first actual use, rather than at module load — reading it
// at module scope makes `next build` fail wherever it evaluates this module,
// before the env var exists (same reasoning as getMongoClient).
function getEncodedKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
}

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt / 1000))
    .sign(getEncodedKey());
}

export async function decrypt(
  session: string | undefined,
): Promise<SessionPayload | null> {
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, role: Role): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const session = await encrypt({ userId, role, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}
