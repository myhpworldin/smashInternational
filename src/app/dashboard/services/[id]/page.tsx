import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getEngagementForClient } from "@/server/services/serviceEngagements.service";
import { SERVICE_ENGAGEMENT_STATUS_LABEL } from "@/shared/types/serviceEngagement";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import EmptyState from "@/components/client/EmptyState";
import { formatDateTime } from "@/lib/format/date";
// Reused as-is (Stage 1 Phase 8 §26/§27) — the same generic, per-service
// requirements renderer the admin detail page uses. It's the client's own
// submitted data (never anything admin-only), and reusing it means every
// field type (groupList entries included) renders correctly here without
// a second implementation of that logic to keep in sync.
import AdminServiceRequirements from "@/components/admin/AdminServiceRequirements";

// Stage 1 Phase 5 §12 — the reusable service-detail shell. Every section
// below except "Service overview" is a future module's landing spot
// (projects/campaigns/performance/reports/documents scoped to just this
// service) — all correctly empty today since none of those exist yet, not
// because this page failed to load them.
export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const { doc } = await resolveOnboardingIdentity();
  const engagement = await getEngagementForClient(new ObjectId(id), doc.clientId);
  if (!engagement) notFound();

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow="Services"
        title={engagement.serviceLabel}
        action={<ClientStatusBadge label={SERVICE_ENGAGEMENT_STATUS_LABEL[engagement.status]} tone="positive" />}
      />

      <ClientSection title="Service overview">
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <div className="flex flex-col">
            <dt className="font-body text-xs text-ash">Requested</dt>
            <dd className="font-body text-sm text-bone">{formatDateTime(engagement.requestedAt)}</dd>
          </div>
          {engagement.activatedAt && (
            <div className="flex flex-col">
              <dt className="font-body text-xs text-ash">Activated</dt>
              <dd className="font-body text-sm text-bone">{formatDateTime(engagement.activatedAt)}</dd>
            </div>
          )}
        </div>
      </ClientSection>

      <ClientSection title="Requirements">
        <AdminServiceRequirements
          selectedServiceIds={[engagement.serviceId]}
          serviceResponses={doc.serviceResponses}
        />
      </ClientSection>

      <ClientSection title="Projects">
        <EmptyState message="No projects available." />
      </ClientSection>

      <ClientSection title="Campaigns">
        <EmptyState message="No campaigns available." />
      </ClientSection>

      <ClientSection title="Performance">
        <EmptyState message="No performance data yet." />
      </ClientSection>

      <ClientSection title="Reports">
        <EmptyState message="No reports available." />
      </ClientSection>

      <ClientSection title="Documents">
        <EmptyState message="No documents available." />
      </ClientSection>
    </div>
  );
}
