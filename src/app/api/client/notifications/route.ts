import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { listNotificationsForClient } from "@/server/services/clientNotifications.service";

export const runtime = "nodejs";

// Stage 1 Phase 22 §22 — clientId always comes from the authenticated
// session, never a query parameter (§9/§35 pattern reused for every
// client-facing list this session).
export async function GET() {
  const user = await getAuthorizedClient();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!user.clientId) {
    return NextResponse.json({ ok: true, notifications: [] }, { status: 200 });
  }

  try {
    const notifications = await listNotificationsForClient(user.clientId);
    return NextResponse.json({ ok: true, notifications }, { status: 200 });
  } catch (error) {
    console.error("[client/notifications/GET] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
