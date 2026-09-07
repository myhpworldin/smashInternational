import { NextRequest, NextResponse } from "next/server";
import { notifySchema } from "@/shared/validation/notify";
import { notify } from "@/server/services/notify.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = notifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        field: "email",
        message: "That email doesn't look right. Check it and try again.",
      },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    const result = await notify(parsed.data.email, ip);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: "Too many requests. Try again in a minute." },
        { status: 429 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    // Without this, a thrown Mongo/connection error fell through as an
    // unhandled 500 with no JSON body — the client then showed the
    // generic "invalid email" fallback, masking real backend failures.
    console.error("[notify] failed to save signup:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Something went wrong saving that. Try again shortly.",
      },
      { status: 500 },
    );
  }
}
