import "server-only";

import {
  findByEmail,
  findById,
  setOtp,
  incrementOtpAttempts,
  clearOtp,
  completePasswordChange,
} from "@/server/repositories/users.repo";
import * as auditLog from "@/server/repositories/auditLog.repo";
import { verifyPassword, hashPassword } from "@/server/auth/password";
import { createSession, deleteSession } from "@/server/auth/session";
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  OTP_VALIDITY_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
} from "@/server/auth/otp";
import { sendEmail } from "@/lib/email/sendEmail";
import { loginOtpEmail } from "@/lib/email/templates";

export type LoginResult =
  | { ok: true; role: "admin" | "client"; mustChangePassword: boolean }
  | { ok: false; reason?: "unverified" | "blocked" };

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await findByEmail(email);
  if (!user) return { ok: false };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false };

  // Blocking must stop a fresh login, not just invalidate a session
  // that's already issued (verifySession in dal.ts handles that half) —
  // checked ahead of the unverified check since a blocked account being
  // unverified is irrelevant to why it can't log in.
  if (user.status === "blocked") {
    return { ok: false, reason: "blocked" };
  }

  // Only ever relevant to client accounts — the field is set by signup's
  // email OTP flow. Admin accounts predate it entirely (undefined), so
  // this never blocks admin login.
  if (user.role === "client" && !user.emailVerified) {
    return { ok: false, reason: "unverified" };
  }

  await createSession(user._id.toHexString(), user.role, user.sessionVersion ?? 1);
  return { ok: true, role: user.role, mustChangePassword: user.mustChangePassword ?? false };
}

export async function logout(): Promise<void> {
  await deleteSession();
}

export type LoginOtpResult = { ok: true } | { ok: false; errors: string[] };
export type LoginOtpVerifyResult =
  | { ok: true; role: "admin" | "client"; mustChangePassword: boolean }
  | { ok: false; errors: string[] };

// Enumeration-safe, same reasoning as signup's OTP flow (see
// signup.service.ts): the response is identical whether the email belongs
// to no account, an unverified one (which can't use OTP login — it hasn't
// finished signup), or a real verified account. Only the side effect (an
// email actually going out) differs.
export async function sendLoginOtp(email: string): Promise<LoginOtpResult> {
  const user = await findByEmail(email);
  // Blocked folded into the same silent no-op as "no account"/unverified —
  // same enumeration-safety reasoning as those two: nothing distinguishes
  // a blocked account's response from any other reason OTP login isn't
  // available to this email.
  if (!user || !user.emailVerified || user.status === "blocked") {
    return { ok: true };
  }

  if (user.otp && Date.now() - user.otp.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otp.lastSentAt.getTime())) / 1000,
    );
    return { ok: false, errors: [`Please wait ${waitSeconds}s before requesting another code.`] };
  }

  const code = generateOtpCode();
  await setOtp(user._id, {
    codeHash: hashOtpCode(code),
    expiresAt: new Date(Date.now() + OTP_VALIDITY_MS),
    attempts: 0,
    lastSentAt: new Date(),
  });
  const content = loginOtpEmail(code, OTP_VALIDITY_MS / 60_000);
  await sendEmail({ to: email, ...content });

  return { ok: true };
}

export async function verifyLoginOtp(email: string, code: string): Promise<LoginOtpVerifyResult> {
  const user = await findByEmail(email);
  if (!user || !user.emailVerified || !user.otp || user.status === "blocked") {
    return { ok: false, errors: ["Invalid or expired code."] };
  }
  if (user.otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, errors: ["This code has expired. Request a new one."] };
  }
  if (user.otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, errors: ["Too many attempts. Request a new code."] };
  }

  if (!verifyOtpCode(code, user.otp.codeHash)) {
    await incrementOtpAttempts(user._id);
    return { ok: false, errors: ["That code isn't right."] };
  }

  // One-time use: cleared in the same flow that creates the session, so a
  // replayed request with the same code can never succeed twice.
  await clearOtp(user._id);
  await createSession(user._id.toHexString(), user.role, user.sessionVersion ?? 1);
  return { ok: true, role: user.role, mustChangePassword: user.mustChangePassword ?? false };
}

export type ChangePasswordResult =
  | { ok: true; role: "admin" | "client" }
  | { ok: false; errors: string[] };

// The one place mustChangePassword ever flips back to false — reached
// either from a first login on an admin-created account or right after an
// admin-initiated reset (Phase 5 spec). Requires the caller to already
// hold a valid session (see requireAuthenticatedSession in dal.ts, which
// deliberately allows a mustChangePassword session through, unlike
// requireRole) — this function re-derives the user from that session's
// id rather than trusting anything the client claims about who they are.
export async function changePassword(userId: string, newPassword: string): Promise<ChangePasswordResult> {
  const user = await findById(userId);
  if (!user) {
    return { ok: false, errors: ["Your session has expired. Log in again."] };
  }

  // Best-effort "not the temporary password again" check (Phase 5 spec,
  // §7) — passwordHash is one-way, so this is the only way to compare
  // against it: verify the *new* password against the *current* hash.
  const sameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    return { ok: false, errors: ["Choose a password different from your current one."] };
  }

  const passwordHash = await hashPassword(newPassword);
  const nextSessionVersion = (user.sessionVersion ?? 1) + 1;
  const wasForced = user.mustChangePassword === true;
  await completePasswordChange(user._id, passwordHash, nextSessionVersion);

  // This endpoint is reachable with any valid session regardless of
  // mustChangePassword (Phase 5 spec, §5) — every real caller today
  // arrives here because it was true, but the audit action still reflects
  // which case actually happened rather than assuming. Metadata never
  // carries the password itself (Phase 7 spec, §4).
  const displayName = user.name ?? user.email;
  await auditLog.record({
    action: wasForced ? "forced_password_change_completed" : "password_changed_by_user",
    actorUserId: user._id,
    actorName: displayName,
    actorEmail: user.email,
    targetUserId: user._id,
    targetName: displayName,
    targetEmail: user.email,
    targetRole: user.role,
    metadata: {},
  });

  // Reissues the cookie at the new session version in the same request —
  // the browser that just completed this change keeps working without a
  // fresh login; any *other* session still holding the old temporary
  // credential's token does not (same invalidation as a block/admin
  // reset — see verifySession in dal.ts).
  await createSession(user._id.toHexString(), user.role, nextSessionVersion);

  return { ok: true, role: user.role };
}
