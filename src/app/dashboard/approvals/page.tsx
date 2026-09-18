import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { listApprovalsForClient } from "@/server/services/approvals.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ApprovalsListClient from "@/components/client/ApprovalsListClient";

export default async function ApprovalsPage() {
  const { doc } = await resolveOnboardingIdentity();
  const approvals = await listApprovalsForClient(doc.clientId);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Work" title="Approvals" />
      <ApprovalsListClient approvals={approvals} />
    </div>
  );
}
