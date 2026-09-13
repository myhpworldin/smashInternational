// Real transport for login's email OTP — mirrors
// src/lib/otp/signupTransport.ts's shape so ClientLoginForm's OTP state
// machine needed no changes beyond swapping the import away from
// src/lib/mock/otp.ts. Mobile-number login still has no backend account
// model (UserDoc has no phone field) — this only covers email.
export type SendOtpResult = { ok: true } | { ok: false; reason: "network" };
export type VerifyOtpResult =
  | { ok: true; role: "admin" | "client" }
  | { ok: false; reason: "invalid" | "network" };

export async function sendLoginOtp(email: string): Promise<SendOtpResult> {
  try {
    const response = await fetch("/api/auth/login/send-otp", {
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

export async function verifyLoginOtp(email: string, code: string): Promise<VerifyOtpResult> {
  try {
    const response = await fetch("/api/auth/login/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await response.json().catch(() => null);

    if (response.ok && data?.ok) return { ok: true, role: data.role };
    if (response.status === 429) return { ok: false, reason: "network" };
    return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
