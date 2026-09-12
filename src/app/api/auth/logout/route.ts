import { NextResponse } from "next/server";
import { logout } from "@/server/services/auth.service";

export const runtime = "nodejs";

export async function POST() {
  await logout();
  return NextResponse.json({ ok: true }, { status: 200 });
}
