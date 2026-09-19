import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { createApprovalSchema } from "@/shared/validation/approvals";
import { createApprovalForAdmin } from "@/server/services/approvals.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid approval payload." }, { status: 400 });
  }
  if (!ObjectId.isValid(parsed.data.clientId)) {
    return NextResponse.json({ ok: false, message: "Invalid client id." }, { status: 400 });
  }
  for (const key of ["projectId", "campaignId", "deliverableId"] as const) {
    const value = parsed.data[key];
    if (value !== undefined && !ObjectId.isValid(value)) {
      return NextResponse.json({ ok: false, message: `Invalid ${key}.` }, { status: 400 });
    }
  }

  try {
    const result = await createApprovalForAdmin(
      {
        clientId: new ObjectId(parsed.data.clientId),
        serviceId: parsed.data.serviceId,
        projectId: parsed.data.projectId ? new ObjectId(parsed.data.projectId) : undefined,
        campaignId: parsed.data.campaignId ? new ObjectId(parsed.data.campaignId) : undefined,
        deliverableId: parsed.data.deliverableId ? new ObjectId(parsed.data.deliverableId) : undefined,
        title: parsed.data.title,
        description: parsed.data.description,
        approvalType: parsed.data.approvalType,
        previewUrl: parsed.data.previewUrl,
      },
      admin,
    );
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, approval: result.data }, { status: 200 });
  } catch (error) {
    console.error("[admin/approvals] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 500 },
    );
  }
}
