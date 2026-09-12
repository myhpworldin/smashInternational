import { requireRole } from "@/server/auth/dal";
import { listForAdmin } from "@/server/services/onboarding.service";
import OnboardingListFilters from "@/components/admin/OnboardingListFilters";
import OnboardingTable from "@/components/admin/OnboardingTable";
import AdminPagination from "@/components/admin/AdminPagination";

type SearchParams = { status?: string; q?: string; page?: string };

export default async function AdminOnboardingListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const page = params.page ? Number(params.page) || 1 : 1;

  const { records, total, pageSize } = await listForAdmin({
    status: params.status,
    q: params.q,
    page,
  });

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <main className="flex flex-col gap-6 px-6 py-10 md:px-10">
      <h1 className="font-display text-xl text-bone">Onboarding submissions</h1>

      <OnboardingListFilters currentStatus={params.status} currentQ={params.q} />

      {records.length === 0 ? (
        <p className="font-body text-sm text-ash">
          {params.q || params.status
            ? "No submissions match this search or filter."
            : "No onboarding submissions yet."}
        </p>
      ) : (
        <>
          <OnboardingTable records={records} />
          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            status={params.status}
            q={params.q}
          />
        </>
      )}
    </main>
  );
}
