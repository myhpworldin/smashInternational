import { NextRequest, NextResponse } from "next/server";
import { verifyOtpSchema } from "@/shared/validation/auth";
import { verifyOtp } from "@/server/services/signup.service";
import { isRateLimited } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Brute-force protection has two independent layers: this IP limit, and
  // the per-account OTP_MAX_ATTEMPTS counter in the service — either one
  // alone would leave a gap (many accounts from one IP; many IPs against
  // one account).
  if (isRateLimited(`verify-otp:${ip}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Enter the 6-digit code." }, { status: 400 });
  }

  try {
    const result = await verifyOtp(parsed.data.email, parsed.data.code);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[auth/signup/verify-otp] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
