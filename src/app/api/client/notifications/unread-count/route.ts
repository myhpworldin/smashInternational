import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { getUnreadCountForClient } from "@/server/services/clientNotifications.service";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthorizedClient();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!user.clientId) {
    return NextResponse.json({ ok: true, count: 0 }, { status: 200 });
  }

  try {
    const count = await getUnreadCountForClient(user.clientId);
    return NextResponse.json({ ok: true, count }, { status: 200 });
  } catch (error) {
    console.error("[client/notifications/unread-count] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
