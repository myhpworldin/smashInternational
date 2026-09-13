import "server-only";

import {
  findByEmail,
  setOtp,
  incrementOtpAttempts,
  clearOtp,
} from "@/server/repositories/users.repo";
import { verifyPassword } from "@/server/auth/password";
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

export type LoginResult =
  | { ok: true; role: "admin" | "client" }
  | { ok: false; reason?: "unverified" };

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await findByEmail(email);
  if (!user) return { ok: false };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false };

  // Only ever relevant to client accounts — the field is set by signup's
  // email OTP flow. Admin accounts predate it entirely (undefined), so
  // this never blocks admin login.
  if (user.role === "client" && !user.emailVerified) {
    return { ok: false, reason: "unverified" };
  }

  await createSession(user._id.toHexString(), user.role);
  return { ok: true, role: user.role };
}

export async function logout(): Promise<void> {
  await deleteSession();
}

export type LoginOtpResult = { ok: true } | { ok: false; errors: string[] };
export type LoginOtpVerifyResult =
  | { ok: true; role: "admin" | "client" }
  | { ok: false; errors: string[] };

// Enumeration-safe, same reasoning as signup's OTP flow (see
// signup.service.ts): the response is identical whether the email belongs
// to no account, an unverified one (which can't use OTP login — it hasn't
// finished signup), or a real verified account. Only the side effect (an
// email actually going out) differs.
export async function sendLoginOtp(email: string): Promise<LoginOtpResult> {
  const user = await findByEmail(email);
  if (!user || !user.emailVerified) {
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
  await sendEmail({
    to: email,
    subject: "Your SMASH login code",
    text: `Your login code is ${code}. It expires in 5 minutes.`,
  });

  return { ok: true };
}

export async function verifyLoginOtp(email: string, code: string): Promise<LoginOtpVerifyResult> {
  const user = await findByEmail(email);
  if (!user || !user.emailVerified || !user.otp) {
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
  await createSession(user._id.toHexString(), user.role);
  return { ok: true, role: user.role };
}
