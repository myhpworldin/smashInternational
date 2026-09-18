import type { BudgetChangeRequest } from "@/shared/types/budget";
import { BUDGET_REQUEST_STATUS_LABEL } from "@/shared/types/budget";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import EmptyState from "@/components/client/EmptyState";
import { formatINR } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";

const POSITIVE = new Set<BudgetChangeRequest["status"]>(["approved", "applied"]);
const ATTENTION = new Set<BudgetChangeRequest["status"]>(["rejected"]);

export default function BudgetRequestList({ requests }: { requests: BudgetChangeRequest[] }) {
  if (requests.length === 0) {
    return <EmptyState message="No budget change requests yet." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {requests.map((r) => {
        const tone = POSITIVE.has(r.status) ? "positive" : ATTENTION.has(r.status) ? "attention" : "neutral";
        const difference = r.requestedAllocation - r.currentAllocation;

        return (
          <li key={r.id} className="flex flex-col gap-2 border border-carbon p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-body text-sm text-bone">
                {r.channelName ?? "General"}
                {r.campaignName ? ` · ${r.campaignName}` : ""}
              </span>
              <ClientStatusBadge label={BUDGET_REQUEST_STATUS_LABEL[r.status]} tone={tone} />
            </div>
            <div className="grid grid-cols-3 gap-2 font-body text-xs">
              <div className="flex flex-col">
                <span className="text-ash">Current</span>
                <span className="text-bone">{formatINR(r.currentAllocation)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-ash">Requested</span>
                <span className="text-bone">{formatINR(r.requestedAllocation)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-ash">Difference</span>
                <span className="text-bone">
                  {difference >= 0 ? "+" : ""}
                  {formatINR(difference)}
                </span>
              </div>
            </div>
            <p className="font-body text-sm text-bone">{r.reason}</p>
            <span className="font-body text-xs text-ash">Requested {formatDateTime(r.requestedAt)}</span>
          </li>
        );
      })}
    </ul>
  );
}
