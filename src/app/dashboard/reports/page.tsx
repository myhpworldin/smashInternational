import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { listReportsForClient } from "@/server/services/reports.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ReportsListClient from "@/components/client/ReportsListClient";

export default async function ReportsPage() {
  const { doc } = await resolveOnboardingIdentity();
  const reports = await listReportsForClient(doc.clientId);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow="Performance"
        title="Reports"
        description="Review your SMASH performance and project reports."
      />
      <ReportsListClient reports={reports} />
    </div>
  );
}
