import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { createDeliverableSchema } from "@/shared/validation/deliverables";
import { createDeliverableForAdmin } from "@/server/services/deliverables.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDeliverableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid deliverable payload." }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ ok: false, message: "Invalid client id." }, { status: 400 });
  }
  for (const key of ["projectId", "campaignId"] as const) {
    const value = parsed.data[key];
    if (value !== undefined && !ObjectId.isValid(value)) {
      return NextResponse.json({ ok: false, message: `Invalid ${key}.` }, { status: 400 });
    }
  }

  try {
    const result = await createDeliverableForAdmin(
      {
        clientId: new ObjectId(parsed.data.clientId),
        serviceId: parsed.data.serviceId,
        projectId: parsed.data.projectId ? new ObjectId(parsed.data.projectId) : undefined,
        campaignId: parsed.data.campaignId ? new ObjectId(parsed.data.campaignId) : undefined,
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        status: parsed.data.status,
        previewUrl: parsed.data.previewUrl,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      },
      admin,
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, deliverable: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/deliverables] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
