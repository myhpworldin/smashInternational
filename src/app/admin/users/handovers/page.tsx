import { requireRole } from "@/server/auth/dal";
import {
  getHandoverSummary,
  listPendingHandoverStaff,
  listCompletedHandoversForAdmin,
} from "@/server/services/handoverOverview.service";
import UserManagementTabs from "@/components/admin/users/UserManagementTabs";
import PendingHandoverList from "@/components/admin/users/PendingHandoverList";
import CompletedHandoverFilters from "@/components/admin/users/CompletedHandoverFilters";
import CompletedHandoverTable from "@/components/admin/users/CompletedHandoverTable";
import CompletedHandoverPagination from "@/components/admin/users/CompletedHandoverPagination";

type SearchParams = { q?: string; service?: string; from?: string; to?: string; page?: string };

export default async function StaffHandoversPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const page = params.page ? Number(params.page) || 1 : 1;

  const [summary, pendingStaff, completed] = await Promise.all([
    getHandoverSummary(),
    listPendingHandoverStaff(),
    listCompletedHandoversForAdmin({ q: params.q, serviceId: params.service, from: params.from, to: params.to, page }),
  ]);

  const totalPages = Math.max(Math.ceil(completed.total / completed.pageSize), 1);

  return (
    <main className="flex flex-col gap-6 px-6 py-10 md:px-10">
      <h1 className="font-display text-xl text-bone">User Management</h1>
      <UserManagementTabs active="handovers" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryTile label="Pending Handovers" value={summary.pendingStaffCount} />
        <SummaryTile label="Affected Services" value={summary.affectedServiceCount} />
        <SummaryTile label="Affected Clients" value={summary.affectedClientCount} />
        <SummaryTile label="Completed Handovers" value={summary.completedHandoverCount} />
        <SummaryTile label="Unassigned Services" value={summary.unassignedActiveServiceCount} />
      </div>

      <section className="flex flex-col gap-3 border-t border-white/15 pt-6">
        <h2 className="font-body text-xs tracking-[0.14em] text-ash uppercase">Pending Handovers</h2>
        <PendingHandoverList rows={pendingStaff} />
      </section>

      <section className="flex flex-col gap-3 border-t border-white/15 pt-6">
        <h2 className="font-body text-xs tracking-[0.14em] text-ash uppercase">Completed Handovers</h2>
        <CompletedHandoverFilters currentQ={params.q} currentServiceId={params.service} currentFrom={params.from} currentTo={params.to} />

        {completed.records.length === 0 ? (
          <p className="font-body text-sm text-ash">
            {params.q || params.service || params.from || params.to
              ? "No completed handovers match this search or filter."
              : "No handovers have been completed yet."}
          </p>
        ) : (
          <>
            <CompletedHandoverTable records={completed.records} />
            <CompletedHandoverPagination
              page={completed.page}
              totalPages={totalPages}
              total={completed.total}
              pageSize={completed.pageSize}
              q={params.q}
              serviceId={params.service}
              from={params.from}
              to={params.to}
            />
          </>
        )}
      </section>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 border border-white/15 bg-carbon p-4">
      <span className="font-display text-2xl text-bone">{value}</span>
      <span className="font-body text-xs text-ash">{label}</span>
    </div>
  );
}
