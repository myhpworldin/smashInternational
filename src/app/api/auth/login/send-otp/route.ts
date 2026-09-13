import { NextRequest, NextResponse } from "next/server";
import { loginOtpRequestSchema } from "@/shared/validation/auth";
import { sendLoginOtp } from "@/server/services/auth.service";
import { isRateLimited } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`login-otp-send:${ip}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginOtpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Enter a valid email." }, { status: 400 });
  }

  try {
    const result = await sendLoginOtp(parsed.data.email);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[auth/login/send-otp] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
