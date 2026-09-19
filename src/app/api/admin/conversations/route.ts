import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { createConversationSchema } from "@/shared/validation/messages";
import { createConversationForAdmin } from "@/server/services/messages.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid conversation payload." }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ ok: false, message: "Invalid client id." }, { status: 400 });
  }
  if (parsed.data.relatedEntityId !== undefined && !ObjectId.isValid(parsed.data.relatedEntityId)) {
    return NextResponse.json({ ok: false, message: "Invalid related entity id." }, { status: 400 });
  }

  try {
    const result = await createConversationForAdmin(
      {
        clientId: new ObjectId(parsed.data.clientId),
        subject: parsed.data.subject,
        serviceId: parsed.data.serviceId,
        relatedEntityType: parsed.data.relatedEntityType,
        relatedEntityId: parsed.data.relatedEntityId ? new ObjectId(parsed.data.relatedEntityId) : undefined,
        message: parsed.data.message,
      },
      admin,
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, conversation: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/conversations] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
