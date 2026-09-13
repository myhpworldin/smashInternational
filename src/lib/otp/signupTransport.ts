// Real transport for signup's email OTP — same return shape as
// src/lib/mock/otp.ts on purpose, so OtpVerificationForm's state machine
// didn't need to change at all when this replaced the mock, only the
// import. (Login's OTP path still uses the mock — that backend doesn't
// exist yet; this only covers signup verification.)
export type SendOtpResult = { ok: true } | { ok: false; reason: "network" };
export type VerifyOtpResult = { ok: true } | { ok: false; reason: "invalid" | "network" };

export async function resendSignupOtp(email: string): Promise<SendOtpResult> {
  try {
    const response = await fetch("/api/auth/signup/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => null);
    return response.ok && data?.ok ? { ok: true } : { ok: false, reason: "network" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function verifySignupOtp(email: string, code: string): Promise<VerifyOtpResult> {
  try {
    const response = await fetch("/api/auth/signup/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await response.json().catch(() => null);

    if (response.ok && data?.ok) return { ok: true };
    if (response.status === 429) return { ok: false, reason: "network" };
    return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
