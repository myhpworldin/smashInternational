import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { createSupportTicketSchema } from "@/shared/validation/supportTickets";
import { createSupportTicketForClient } from "@/server/services/supportTickets.service";

export const runtime = "nodejs";

// Stage 1 Phase 22 §29 — the real endpoint behind SupportTicketForm.tsx
// (currently calling the honest lib/client-actions/support.ts stub).
// That stub's input carries a `serviceLabel` string, not a serviceId —
// resolving a label back to a real service reference is Phase 23's
// integration job; this route already accepts a real `serviceId`
// directly, ready for whichever future call site sends one.
export async function POST(request: Request) {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSupportTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid support ticket payload." }, { status: 400 });
  }

  try {
    const result = await createSupportTicketForClient(
      {
        subject: parsed.data.subject,
        serviceId: parsed.data.serviceId,
        description: parsed.data.description,
        priority: parsed.data.priority,
      },
      user.clientId,
      user,
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ticket: result.data }, { status: 200 });
  } catch (error) {
    console.error("[client/support-tickets] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
