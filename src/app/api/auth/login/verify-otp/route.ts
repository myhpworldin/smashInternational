import { NextRequest, NextResponse } from "next/server";
import { loginOtpVerifySchema } from "@/shared/validation/auth";
import { verifyLoginOtp } from "@/server/services/auth.service";
import { isRateLimited } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`login-otp-verify:${ip}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginOtpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Enter the 6-digit code." }, { status: 400 });
  }

  try {
    const result = await verifyLoginOtp(parsed.data.email, parsed.data.code);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 401 });
    }
    return NextResponse.json(
      { ok: true, role: result.role, mustChangePassword: result.mustChangePassword },
      { status: 200 },
    );
  } catch (error) {
    console.error("[auth/login/verify-otp] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
