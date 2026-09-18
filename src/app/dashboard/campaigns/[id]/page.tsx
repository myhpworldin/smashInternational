import { notFound } from "next/navigation";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getCampaignForClient } from "@/server/services/campaigns.service";
import { CAMPAIGN_STATUS_LABEL } from "@/shared/types/campaign";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import ProgressBar from "@/components/client/ProgressBar";
import EmptyState from "@/components/client/EmptyState";
import { FieldGrid, Field } from "@/components/client/FieldGrid";
import { formatDateTime } from "@/lib/format/date";
import { formatINR } from "@/lib/format/currency";

// Stage 1 Phase 9 §18 — same ownership pattern as the project detail page:
// getCampaignForClient returns null for a nonexistent id and for one
// belonging to another client alike.
export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { doc } = await resolveOnboardingIdentity();
  const campaign = await getCampaignForClient(id, doc.clientId);
  if (!campaign) notFound();

  const hasBudget = campaign.budget !== undefined || campaign.spent !== undefined || campaign.remaining !== undefined;

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow={campaign.serviceLabel}
        title={campaign.name}
        action={<ClientStatusBadge label={CAMPAIGN_STATUS_LABEL[campaign.status]} tone="positive" />}
      />

      <ClientSection title="Campaign overview">
        <div className="flex flex-col gap-4">
          <FieldGrid>
            <Field label="Related service" value={campaign.serviceLabel} />
            {campaign.platform && <Field label="Platform" value={campaign.platform} />}
            {campaign.objective && <Field label="Objective" value={campaign.objective} />}
            {campaign.startDate && <Field label="Start date" value={formatDateTime(campaign.startDate)} />}
            {campaign.endDate && <Field label="End date" value={formatDateTime(campaign.endDate)} />}
          </FieldGrid>
          {typeof campaign.progress === "number" && <ProgressBar value={campaign.progress} label="Campaign Progress" />}
        </div>
      </ClientSection>

      <ClientSection title="Budget summary">
        {hasBudget ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {campaign.budget !== undefined && (
              <div className="flex flex-col border border-carbon p-4">
                <span className="font-body text-xs text-ash uppercase">Budget</span>
                <span className="font-display text-lg text-bone">{formatINR(campaign.budget)}</span>
              </div>
            )}
            {campaign.spent !== undefined && (
              <div className="flex flex-col border border-carbon p-4">
                <span className="font-body text-xs text-ash uppercase">Spent</span>
                <span className="font-display text-lg text-bone">{formatINR(campaign.spent)}</span>
              </div>
            )}
            {campaign.remaining !== undefined && (
              <div className="flex flex-col border border-carbon p-4">
                <span className="font-body text-xs text-ash uppercase">Remaining</span>
                <span className="font-display text-lg text-bone">{formatINR(campaign.remaining)}</span>
              </div>
            )}
          </div>
        ) : (
          <EmptyState message="Budget information will appear here once available." />
        )}
      </ClientSection>

      <ClientSection title="Performance">
        <EmptyState message="Performance data will appear here once campaign activity begins." />
      </ClientSection>

      {campaign.latestUpdate && (
        <ClientSection title="Latest update">
          <div className="flex flex-col gap-1 border border-carbon p-4">
            <p className="font-body text-sm text-bone">{campaign.latestUpdate.message}</p>
            <p className="font-body text-xs text-ash">Updated {formatDateTime(campaign.latestUpdate.updatedAt)}</p>
          </div>
        </ClientSection>
      )}
    </div>
  );
}
