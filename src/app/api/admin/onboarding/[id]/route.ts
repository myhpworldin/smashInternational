import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifySession } from "@/server/auth/dal";
import { getForAdmin, listAssets } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const onboarding = await getForAdmin(new ObjectId(id));
  if (!onboarding) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const assets = await listAssets(onboarding._id);
  return NextResponse.json({ ok: true, onboarding, assets }, { status: 200 });
}
