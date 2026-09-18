import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { listDeliverablesForClient } from "@/server/services/deliverables.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import DeliverableCard from "@/components/client/DeliverableCard";
import EmptyState from "@/components/client/EmptyState";

export default async function DeliverablesPage() {
  const { doc } = await resolveOnboardingIdentity();
  const deliverables = await listDeliverablesForClient(doc.clientId);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Work" title="Deliverables" />
      {deliverables.length === 0 ? (
        <EmptyState message="No deliverables available yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {deliverables.map((d) => (
            <li key={d.id}>
              <DeliverableCard deliverable={d} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
