import Link from "next/link";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  status?: string;
  q?: string;
};

// Server-driven pagination (never loads the full collection into the
// browser) — plain links carrying the page number in the query string.
export default function AdminPagination({ page, totalPages, total, pageSize, status, q }: AdminPaginationProps) {
  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    params.set("page", String(targetPage));
    return `/admin/onboarding?${params.toString()}`;
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
