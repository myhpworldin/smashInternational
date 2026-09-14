import { requireRole } from "@/server/auth/dal";
import { listAuditLogsForAdmin } from "@/server/services/auditLog.service";
import UserManagementTabs from "@/components/admin/users/UserManagementTabs";
import AuditLogFilters from "@/components/admin/users/AuditLogFilters";
import AuditLogTable from "@/components/admin/users/AuditLogTable";
import AuditLogPagination from "@/components/admin/users/AuditLogPagination";

type SearchParams = { action?: string; role?: string; q?: string; from?: string; to?: string; page?: string };

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const page = params.page ? Number(params.page) || 1 : 1;

  const { records, total, pageSize } = await listAuditLogsForAdmin({
    action: params.action,
    role: params.role,
    q: params.q,
    from: params.from,
    to: params.to,
    page,
  });

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <main className="flex flex-col gap-6 px-6 py-10 md:px-10">
      <h1 className="font-display text-xl text-bone">User Management</h1>
      <UserManagementTabs active="audit-log" />

      <AuditLogFilters
        currentAction={params.action}
        currentRole={params.role}
        currentQ={params.q}
        currentFrom={params.from}
        currentTo={params.to}
      />

      {records.length === 0 ? (
        <p className="font-body text-sm text-ash">
          {params.q || params.action || params.role || params.from || params.to
            ? "No audit events match this search or filter."
            : "No audit events yet."}
        </p>
      ) : (
        <>
          <AuditLogTable records={records} />
          <AuditLogPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            action={params.action}
            role={params.role}
            q={params.q}
            from={params.from}
            to={params.to}
          />
        </>
      )}
    </main>
  );
}
