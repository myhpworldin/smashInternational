import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getDeliverableForClient } from "@/server/services/deliverables.service";
import { CLIENT_DELIVERABLE_STATUS_LABEL } from "@/shared/types/deliverable";
import { APPROVAL_STATUS_LABEL } from "@/shared/types/approval";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import { FieldGrid, Field } from "@/components/client/FieldGrid";
import { formatDateTime } from "@/lib/format/date";

// Stage 1 Phase 12 §33/§35 — a deliverable can exist with no approval
// request at all (approvalStatus is optional); when one does exist, this
// links out to the Approvals area rather than duplicating the
// approve/request-changes UI here.
export default async function DeliverableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { doc } = await resolveOnboardingIdentity();
  const deliverable = await getDeliverableForClient(id, doc.clientId);
  if (!deliverable) notFound();

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow={deliverable.type}
        title={`${deliverable.title} · v${deliverable.version}`}
        action={<ClientStatusBadge label={CLIENT_DELIVERABLE_STATUS_LABEL[deliverable.status]} tone="positive" />}
      />

      <ClientSection title="Details">
        <FieldGrid>
          {deliverable.serviceLabel && <Field label="Service" value={deliverable.serviceLabel} />}
          {deliverable.relatedLabel && <Field label="Campaign / Project" value={deliverable.relatedLabel} />}
          <Field label="Created" value={formatDateTime(deliverable.createdAt)} />
          <Field label="Last updated" value={formatDateTime(deliverable.updatedAt)} />
        </FieldGrid>
        {deliverable.description && <p className="mt-3 font-body text-sm text-bone">{deliverable.description}</p>}
      </ClientSection>

      <ClientSection title="Preview">
        {deliverable.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external/asset preview URL, not a local static import
          <img src={deliverable.previewUrl} alt={deliverable.title} className="max-w-full border border-carbon" />
        ) : (
          <p className="font-body text-sm text-ash">No preview available for this item.</p>
        )}
      </ClientSection>

      {deliverable.approvalStatus && (
        <ClientSection title="Approval">
          <div className="flex items-center justify-between gap-3 border border-carbon p-4">
            <ClientStatusBadge label={APPROVAL_STATUS_LABEL[deliverable.approvalStatus]} tone="neutral" />
            <Link href="/dashboard/approvals" className="font-body text-xs text-ash underline hover:text-bone">
              View in Approvals
            </Link>
          </div>
        </ClientSection>
      )}
    </div>
  );
}
