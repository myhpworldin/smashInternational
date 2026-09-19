import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { addSupportMessageSchema } from "@/shared/validation/supportTickets";
import { addSupportMessageForClient } from "@/server/services/supportTickets.service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addSupportMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Message cannot be empty." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const result = await addSupportMessageForClient(id, user.clientId, parsed.data.text, user);
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ticket: result.data }, { status: 200 });
  } catch (error) {
    console.error("[client/support-tickets/messages] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
