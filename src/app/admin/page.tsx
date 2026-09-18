import Link from "next/link";
import { requireRole } from "@/server/auth/dal";
import { getAdminStatusCounts } from "@/server/services/onboarding.service";
import { ADMIN_STATUS_FILTERS } from "@/shared/types/onboarding";

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const counts = await getAdminStatusCounts();
  const totalSubmissions = counts.submitted + counts.under_review + counts.approved + counts.changes_requested;

  return (
    <main className="flex flex-col gap-6 px-6 py-10 md:px-10">
      <h1 className="font-display text-xl text-bone">Admin</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ADMIN_STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={`/admin/onboarding?status=${filter.id}`}
            className="flex flex-col gap-1 border border-white/15 bg-carbon p-4 transition-colors duration-150 hover:border-white/30"
          >
            <span className="font-display text-2xl text-bone">{counts[filter.id]}</span>
            <span className="font-body text-xs text-ash">{filter.label}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/onboarding"
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void focus-visible:-outline-offset-2"
        >
          {totalSubmissions === 0 ? "View onboarding submissions" : `View all ${totalSubmissions} submissions`}
        </Link>
        <Link
          href="/admin/users"
          className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
        >
          Manage users
        </Link>
        <Link
          href="/admin/data-entry"
          className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
        >
          Daily data entry
        </Link>
      </div>
    </main>
  );
}
