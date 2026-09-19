import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/shared/validation/auth";
import { login } from "@/server/services/auth.service";
import { isRateLimited } from "@/server/rate-limit";

export const runtime = "nodejs";

// Stage 1 Phase 27 — this password-login endpoint had no rate limiting
// at all, unlike every other auth endpoint in this codebase (signup,
// both OTP-verify routes, resend-otp all already use isRateLimited),
// leaving unlimited password-guessing attempts against any account.
// Reuses the exact same existing helper rather than inventing new
// throttling infrastructure.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`login:${ip}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email and password." },
      { status: 400 },
    );
  }

  try {
    const result = await login(parsed.data.email, parsed.data.password);

    if (!result.ok) {
      const message =
        result.reason === "unverified"
          ? "Verify your email before logging in."
          : "Incorrect email or password.";
      // `reason` is only ever "unverified" once verifyPassword has
      // already succeeded (see login() in auth.service.ts) — it can't be
      // used to probe whether an email has an account without already
      // knowing its password, so exposing it here (rather than folding
      // it into the message string) is safe the same way the message
      // itself already was.
      return NextResponse.json({ ok: false, message, reason: result.reason }, { status: 401 });
    }

    return NextResponse.json(
      { ok: true, role: result.role, mustChangePassword: result.mustChangePassword },
      { status: 200 },
    );
  } catch (error) {
    console.error("[auth/login] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
