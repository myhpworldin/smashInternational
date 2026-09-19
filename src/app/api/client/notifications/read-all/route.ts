import { NextResponse } from "next/server";
import { getAuthorizedClient } from "@/server/auth/dal";
import { markAllNotificationsReadForClient } from "@/server/services/clientNotifications.service";

export const runtime = "nodejs";

// Stage 1 Phase 22 §22 — backs NotificationsListClient's existing "Mark
// all as read" button, which today only updates its local sessionStorage
// (Phase 15's disclosed limitation). Wiring the button to call this is a
// Phase 23 integration task.
export async function PATCH() {
  const user = await getAuthorizedClient();
  if (!user || !user.clientId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    await markAllNotificationsReadForClient(user.clientId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[client/notifications/read-all] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
