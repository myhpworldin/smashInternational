import "server-only";
import { ObjectId } from "mongodb";
import * as usersRepo from "@/server/repositories/users.repo";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  OTP_VALIDITY_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
} from "@/server/auth/otp";
import { sendEmail } from "@/lib/email/sendEmail";

export type SignupResult = { ok: true } | { ok: false; errors: string[] };

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000;
}

async function dispatchOtp(userId: ObjectId, email: string): Promise<void> {
  const code = generateOtpCode();
  await usersRepo.setOtp(userId, {
    codeHash: hashOtpCode(code),
    expiresAt: new Date(Date.now() + OTP_VALIDITY_MS),
    attempts: 0,
    lastSentAt: new Date(),
  });
  await sendEmail({
    to: email,
    subject: "Your SMASH verification code",
    text: `Your verification code is ${code}. It expires in 5 minutes.`,
  });
}

// Duplicate accounts: a verified email never gets a second account, and a
// race between two concurrent signups for the same brand-new email can't
// produce two documents either (caught below, not just prevented by the
// happy-path check above). Account enumeration: the response shape is
// identical ({ok:true}) whether the email was free, already verified, or
// mid-signup — only the email that gets sent differs, and only the
// recipient (who already proved they control that inbox) ever sees it.
export async function signup(email: string, password: string): Promise<SignupResult> {
  const existing = await usersRepo.findByEmail(email);

  if (existing?.emailVerified) {
    await sendEmail({
      to: email,
      subject: "You already have a SMASH account",
      text: "Someone tried to sign up with this email, but an account already exists. If this was you, log in instead.",
    });
    return { ok: true };
  }

  const passwordHash = await hashPassword(password);

  if (existing && !existing.emailVerified) {
    await usersRepo.replaceUnverifiedSignup(existing._id, passwordHash);
    await dispatchOtp(existing._id, email);
    return { ok: true };
  }

  try {
    const user = await usersRepo.create({ email, passwordHash, role: "client" });
    await dispatchOtp(user._id, email);
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    // Lost a race with a concurrent signup for the same email — treat it
    // as resuming that just-created account rather than failing.
    const winner = await usersRepo.findByEmail(email);
    if (winner && !winner.emailVerified) {
      await dispatchOtp(winner._id, email);
    }
  }

  return { ok: true };
}

export async function resendOtp(email: string): Promise<SignupResult> {
  const user = await usersRepo.findByEmail(email);
  if (!user || user.emailVerified) {
    // Same enumeration-safety reasoning as signup() — no signal either way.
    return { ok: true };
  }

  if (user.otp && Date.now() - user.otp.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otp.lastSentAt.getTime())) / 1000,
    );
    return { ok: false, errors: [`Please wait ${waitSeconds}s before requesting another code.`] };
  }

  await dispatchOtp(user._id, email);
  return { ok: true };
}

export async function verifyOtp(email: string, code: string): Promise<SignupResult> {
  const user = await usersRepo.findByEmail(email);
  if (!user || user.emailVerified) {
    return { ok: false, errors: ["Invalid or expired code."] };
  }
  if (!user.otp) {
    return { ok: false, errors: ["No verification code is pending. Request a new one."] };
  }
  if (user.otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, errors: ["This code has expired. Request a new one."] };
  }
  if (user.otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, errors: ["Too many attempts. Request a new code."] };
  }

  if (!verifyOtpCode(code, user.otp.codeHash)) {
    await usersRepo.incrementOtpAttempts(user._id);
    return { ok: false, errors: ["That code isn't right."] };
  }

  // One-time use: markEmailVerified clears the OTP in the same write that
  // flips the account to verified, so a replayed request with the same
  // code can never succeed twice.
  await usersRepo.markEmailVerified(user._id);
  await createSession(user._id.toHexString(), "client");
  return { ok: true };
}
