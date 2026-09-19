import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { sendMessageSchema } from "@/shared/validation/messages";
import { sendMessageForClient } from "@/server/services/messages.service";

export const runtime = "nodejs";

// Stage 1 Phase 22 §26/§28 — the real endpoint behind MessageComposer.tsx
// (currently calling the honest lib/client-actions/messages.ts stub).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Message cannot be empty." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const result = await sendMessageForClient(id, user.clientId, parsed.data.text, user);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, conversation: result.data }, { status: 200 });
  } catch (error) {
    console.error("[client/conversations/messages] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
