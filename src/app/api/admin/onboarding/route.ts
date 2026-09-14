import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/server/auth/dal";
import { listForAdmin } from "@/server/services/onboarding.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await getAuthorizedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const result = await listForAdmin({
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
    page: params.get("page") ? Number(params.get("page")) : undefined,
    pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : undefined,
  });

  return NextResponse.json(
    {
      ok: true,
      onboarding: result.records,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
    { status: 200 },
  );
}
