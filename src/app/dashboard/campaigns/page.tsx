import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { listCampaignsForClient } from "@/server/services/campaigns.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import CampaignsListClient from "@/components/client/CampaignsListClient";

export default async function CampaignsPage() {
  const { doc } = await resolveOnboardingIdentity();
  const campaigns = await listCampaignsForClient(doc.clientId);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Work" title="Campaigns" />
      <CampaignsListClient campaigns={campaigns} />
    </div>
  );
}
