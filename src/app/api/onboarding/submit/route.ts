import { NextResponse } from "next/server";
import { getOrCreateAnonymousDraft, submitDraft } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

export async function POST() {
  const doc = await getOrCreateAnonymousDraft();
  const result = await submitDraft(doc._id, doc.clientId);

  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true, status: "submitted", submittedAt: result.data.submittedAt },
    { status: 200 },
  );
}
