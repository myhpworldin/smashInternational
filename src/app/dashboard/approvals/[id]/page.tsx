import { notFound } from "next/navigation";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getApprovalForClient } from "@/server/services/approvals.service";
import { APPROVAL_STATUS_LABEL } from "@/shared/types/approval";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import ApprovalActions from "@/components/client/ApprovalActions";
import { FieldGrid, Field } from "@/components/client/FieldGrid";
import { formatDateTime } from "@/lib/format/date";

// Stage 1 Phase 22 — added "viewed": the real backend now transitions
// awaiting_client -> viewed the moment a client opens this page
// (getApprovalForClient's implicit "client views" step, since there's no
// separate "mark as viewed" control anywhere in this UI). Without this,
// simply opening an approval would make it disappear from being
// actionable one render later — a real gap this Phase 12 constant
// predates, now closed to keep the contract with the real backend valid.
const ACTIONABLE = new Set(["awaiting_client", "viewed", "updated", "resubmitted"]);

// Stage 1 Phase 12 §25/§26 — same ownership pattern as every other
// client detail page this session: getApprovalForClient returns null for
// a nonexistent id and one belonging to another client alike.
export default async function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { doc } = await resolveOnboardingIdentity();
  const approval = await getApprovalForClient(id, doc.clientId);
  if (!approval) notFound();

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow={approval.type}
        title={approval.title}
        action={<ClientStatusBadge label={APPROVAL_STATUS_LABEL[approval.status]} tone="positive" />}
      />

      <ClientSection title="Details">
        <FieldGrid>
          {approval.serviceLabel && <Field label="Service" value={approval.serviceLabel} />}
          {approval.relatedLabel && <Field label="Campaign / Project" value={approval.relatedLabel} />}
          {approval.version && <Field label="Version" value={`Version ${approval.version}`} />}
          <Field label="Submitted" value={formatDateTime(approval.submittedAt)} />
        </FieldGrid>
        {approval.description && <p className="mt-3 font-body text-sm text-bone">{approval.description}</p>}
      </ClientSection>

      <ClientSection title="Preview">
        {approval.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external/asset preview URL, not a local static import
          <img src={approval.previewUrl} alt={approval.title} className="max-w-full border border-carbon" />
        ) : (
          <p className="font-body text-sm text-ash">No preview available for this item.</p>
        )}
      </ClientSection>

      {ACTIONABLE.has(approval.status) && (
        <ClientSection title="Your Review">
          <ApprovalActions approvalId={approval.id} />
        </ClientSection>
      )}
    </div>
  );
}
