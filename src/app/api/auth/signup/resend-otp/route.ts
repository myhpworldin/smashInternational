import { NextRequest, NextResponse } from "next/server";
import { resendOtpSchema } from "@/shared/validation/auth";
import { resendOtp } from "@/server/services/signup.service";
import { isRateLimited } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // A tighter IP limit than signup itself — resend is the endpoint most
  // exposed to abuse (repeatedly emailing one address) since it needs no
  // password guess to call, just an email string.
  if (isRateLimited(`resend-otp:${ip}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = resendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Enter a valid email." }, { status: 400 });
  }

  try {
    const result = await resendOtp(parsed.data.email);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 429 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[auth/signup/resend-otp] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
