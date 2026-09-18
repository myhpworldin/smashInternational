import { formatINR } from "@/lib/format/currency";

// Stage 1 Phase 12 §10/§11 — a plain spent-of-allocated bar (no new chart
// library, consistent with the dependency-free approach already used for
// TrendChart in Phase 10). Status is a factual, non-judgmental label
// ("Fully Allocated" / "Within Allocation" / "No Spend Recorded") — never
// a "Good"/"Bad" score (§11 explicitly forbids that).
export default function BudgetAllocationBar({
  name,
  allocated,
  spent,
  remaining,
}: {
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
}) {
  const spentPct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const status = allocated === 0 ? "Data Unavailable" : spent === 0 ? "No Spend Recorded" : spent >= allocated ? "Fully Allocated" : "Within Allocation";

  return (
    <div className="flex flex-col gap-2 border border-carbon p-4">
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-bone">{name}</span>
        <span className="font-body text-xs text-ash">{status}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${name} spend`}
        aria-valuenow={Math.round(spentPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full bg-void"
      >
        <div className="h-full bg-smash" style={{ width: `${spentPct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 font-body text-xs">
        <div className="flex flex-col">
          <span className="text-ash">Allocated</span>
          <span className="text-bone">{formatINR(allocated)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-ash">Spent</span>
          <span className="text-bone">{formatINR(spent)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-ash">Remaining</span>
          <span className="text-bone">{formatINR(remaining)}</span>
        </div>
      </div>
    </div>
  );
}
