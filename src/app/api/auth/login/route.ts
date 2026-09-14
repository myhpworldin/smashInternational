import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/shared/validation/auth";
import { login } from "@/server/services/auth.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ ok: false, message }, { status: 401 });
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
