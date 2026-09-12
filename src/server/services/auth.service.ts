import "server-only";

import { findByEmail } from "@/server/repositories/users.repo";
import { verifyPassword } from "@/server/auth/password";
import { createSession, deleteSession } from "@/server/auth/session";

export type LoginResult =
  | { ok: true; role: "admin" | "client" }
  | { ok: false };

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await findByEmail(email);
  if (!user) return { ok: false };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false };

  await createSession(user._id.toHexString(), user.role);
  return { ok: true, role: user.role };
}

export async function logout(): Promise<void> {
  await deleteSession();
}
