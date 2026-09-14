import Link from "next/link";

type AuditLogPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  action?: string;
  role?: string;
  q?: string;
  from?: string;
  to?: string;
};

// Same server-driven pagination as AdminPagination (onboarding's) — never
// loads the full collection into the browser (Phase 7 spec §9) — but
// carrying this page's own filter set rather than onboarding's, so it's
// a separate small component instead of overloading that one.
export default function AuditLogPagination({
  page,
  totalPages,
  total,
  pageSize,
  action,
  role,
  q,
  from,
  to,
}: AuditLogPaginationProps) {
  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (role) params.set("role", role);
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(targetPage));
    return `/admin/users/audit-log?${params.toString()}`;
  };

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between font-body text-xs text-ash">
      <span>
        {start}–{end} of {total}
      </span>
      <div className="flex gap-3">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="underline hover:text-bone focus-visible:-outline-offset-2">
            Previous
          </Link>
        ) : (
          <span className="opacity-40">Previous</span>
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className="underline hover:text-bone focus-visible:-outline-offset-2">
            Next
          </Link>
        ) : (
          <span className="opacity-40">Next</span>
        )}
      </div>
    </div>
  );
}
