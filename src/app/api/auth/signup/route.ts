import { NextRequest, NextResponse } from "next/server";
import { signupRequestSchema } from "@/shared/validation/auth";
import { signup } from "@/server/services/signup.service";
import { isRateLimited } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`signup:${ip}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email and password.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await signup(parsed.data.email, parsed.data.password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[auth/signup] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
