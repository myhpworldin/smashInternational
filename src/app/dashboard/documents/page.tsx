import { resolveOnboardingIdentity, listAssets } from "@/server/services/onboarding.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
// Reused as-is (Phase 5 §20: "use existing file/document infrastructure
// if already available") — this renders the exact same asset grid the
// admin detail page shows, backed by the same authenticated
// /api/onboarding/assets/[id]/file route, which already permits the
// owning client's own session, not just an admin one.
import AdminAssetsList from "@/components/admin/AdminAssetsList";

export default async function DocumentsPage() {
  const { doc } = await resolveOnboardingIdentity();
  const assets = await listAssets(doc._id);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow="My Business"
        title="Documents"
        description="Files you uploaded during onboarding."
      />
      <AdminAssetsList assets={assets} />
    </div>
  );
}
