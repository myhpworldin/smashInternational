import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getBudgetForClient, listBudgetRequestsForClient } from "@/server/services/budget.service";
import { formatINR } from "@/lib/format/currency";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import EmptyState from "@/components/client/EmptyState";
import DataTimestamp from "@/components/client/DataTimestamp";
import BudgetAllocationBar from "@/components/client/BudgetAllocationBar";
import BudgetRequestForm from "@/components/client/BudgetRequestForm";
import BudgetRequestList from "@/components/client/BudgetRequestList";
import MetricCard from "@/components/client/MetricCard";
import type { BudgetInput } from "@/shared/validation/onboarding";

// Stage 1 Phase 5 §18 (extended in Phase 12) — "Requested monthly budget"
// stays the onboarding-planned figure (Phase 2/4's real data); everything
// below it is the ACTUAL allocation/spend tracking contract from Phase 12
// (server/services/budget.service.ts), which has no backend yet and so
// renders its own honest empty states rather than reusing/faking the
// onboarding figure for something it was never meant to represent.
export default async function BudgetPage() {
  const { doc } = await resolveOnboardingIdentity();
  const plannedBudget = doc.budget as Partial<BudgetInput> | null;
  const [snapshot, requests] = await Promise.all([
    getBudgetForClient(doc.clientId),
    listBudgetRequestsForClient(doc.clientId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Finance" title="Budget & Spending" />

      <ClientSection title="Requested monthly budget">
        {plannedBudget?.monthlyTotal ? (
          <div className="flex flex-col gap-2">
            <p className="font-display text-2xl text-bone">{formatINR(plannedBudget.monthlyTotal)}</p>
            {plannedBudget.allocations && plannedBudget.allocations.length > 0 && (
              <ul className="flex flex-col gap-1 font-body text-sm text-bone">
                {plannedBudget.allocations.map((a) => (
                  <li key={a.channel} className="flex items-center justify-between border border-carbon px-3 py-2">
                    <span>{a.channel}</span>
                    <span className="text-ash">{formatINR(a.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <EmptyState message="No budget submitted yet." />
        )}
      </ClientSection>

      {snapshot ? (
        <>
          <ClientSection title={`Actual spend — ${snapshot.periodLabel}`}>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label="Total Budget" value={formatINR(snapshot.total)} />
                <MetricCard label="Allocated" value={formatINR(snapshot.allocated)} />
                <MetricCard label="Spent" value={formatINR(snapshot.spent)} />
                <MetricCard label="Remaining" value={formatINR(snapshot.remaining)} />
              </div>
              <DataTimestamp reportingDate={snapshot.periodLabel} updatedAt={snapshot.updatedAt} />
            </div>
          </ClientSection>

          <ClientSection title="Budget Allocation">
            {snapshot.allocations.length === 0 ? (
              <EmptyState message="No allocation breakdown available yet." />
            ) : (
              <div className="flex flex-col gap-3">
                {snapshot.allocations.map((a) => (
                  <BudgetAllocationBar key={a.id} name={a.name} allocated={a.allocated} spent={a.spent} remaining={a.remaining} />
                ))}
              </div>
            )}
          </ClientSection>
        </>
      ) : (
        <ClientSection title="Actual spend">
          <EmptyState message="Budget information has not been configured yet." />
        </ClientSection>
      )}

      <ClientSection title="Request a Budget Change">
        <BudgetRequestForm channels={snapshot?.allocations ?? []} />
      </ClientSection>

      <ClientSection title="Budget Requests">
        <BudgetRequestList requests={requests} />
      </ClientSection>
    </div>
  );
}
