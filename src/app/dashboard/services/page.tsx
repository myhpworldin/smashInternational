import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { listEngagementsForClient } from "@/server/services/serviceEngagements.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ServiceCard from "@/components/client/ServiceCard";
import EmptyState from "@/components/client/EmptyState";

export default async function ServicesPage() {
  const { doc } = await resolveOnboardingIdentity();
  const engagements = await listEngagementsForClient(doc.clientId);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Services" title="My Services" />

      {engagements.length === 0 ? (
        <EmptyState message="No services available yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {engagements.map((e) => (
            <li key={e.id}>
              <ServiceCard engagement={e} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
