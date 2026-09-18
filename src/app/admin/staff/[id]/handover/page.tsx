import Link from "next/link";
import { requireRole } from "@/server/auth/dal";
import { getAdminUserById, listAssignableStaffForAdmin } from "@/server/services/adminUsers.service";
import { listHandoverRequiredForStaff } from "@/server/services/serviceAssignments.service";
import { ADMIN_USER_STATUS_LABEL, STAFF_AVAILABILITY_LABEL } from "@/shared/types/adminUser";
import StaffHandoverQueue from "@/components/admin/StaffHandoverQueue";

export default async function StaffHandoverPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;

  const staff = await getAdminUserById(id);
  if (!staff || staff.role !== "staff") {
    return (
      <main className="px-6 py-10 md:px-10">
        <p className="font-body text-sm text-smash-text">That staff member doesn&apos;t exist.</p>
        <Link href="/admin/users" className="mt-2 inline-block font-body text-sm text-ash underline">
          Back to users
        </Link>
      </main>
    );
  }

  const [rows, assignableStaff] = await Promise.all([
    listHandoverRequiredForStaff(id),
    listAssignableStaffForAdmin(),
  ]);

  return (
    <main className="flex flex-col gap-6 px-6 py-10 md:px-10">
      <div className="flex flex-col gap-1">
        <Link href="/admin/users" className="font-body text-xs text-ash underline hover:text-bone">
          ← Back to users
        </Link>
        <h1 className="font-display text-xl text-bone">{staff.name}</h1>
        <p className="font-body text-sm text-ash">
          Account: {ADMIN_USER_STATUS_LABEL[staff.status]}
          {staff.availability ? ` · Availability: ${STAFF_AVAILABILITY_LABEL[staff.availability]}` : ""}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-body text-xs tracking-[0.14em] text-ash uppercase">Active work requiring handover</h2>
        <StaffHandoverQueue
          staffUserId={id}
          initialRows={rows}
          assignableStaff={assignableStaff.filter((s) => s.id !== id)}
        />
      </div>
    </main>
  );
}
