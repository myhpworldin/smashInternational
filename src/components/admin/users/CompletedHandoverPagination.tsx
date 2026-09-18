import Link from "next/link";

type CompletedHandoverPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  q?: string;
  serviceId?: string;
  from?: string;
  to?: string;
};

// Same server-driven pagination as AuditLogPagination — never loads the
// full collection into the browser.
export default function CompletedHandoverPagination({
  page,
  totalPages,
  total,
  pageSize,
  q,
  serviceId,
  from,
  to,
}: CompletedHandoverPaginationProps) {
  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (serviceId) params.set("service", serviceId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(targetPage));
    return `/admin/users/handovers?${params.toString()}`;
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
