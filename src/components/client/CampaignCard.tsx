import Link from "next/link";
import type { ClientCampaign } from "@/shared/types/campaign";
import { CAMPAIGN_STATUS_LABEL } from "@/shared/types/campaign";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import ProgressBar from "@/components/client/ProgressBar";
import { formatDateTime } from "@/lib/format/date";
import { formatINR } from "@/lib/format/currency";

const POSITIVE = new Set(["live", "optimizing", "completed"]);
const ATTENTION = new Set(["paused", "on_hold"]);

// Stage 1 Phase 9 §16 — same rule as ProjectCard: budget/spent/remaining/
// progress/platform are all optional and simply omitted when the caller
// doesn't have a real value, never shown as a fabricated ₹0 or 0%.
export default function CampaignCard({ campaign }: { campaign: ClientCampaign }) {
  const tone = POSITIVE.has(campaign.status) ? "positive" : ATTENTION.has(campaign.status) ? "attention" : "neutral";

  return (
    <Link
      href={`/dashboard/campaigns/${campaign.id}`}
      className="flex flex-col gap-3 border border-carbon p-4 transition-colors duration-150 hover:border-white/30 focus-visible:-outline-offset-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-body text-sm text-bone">{campaign.name}</span>
          <span className="font-body text-xs text-ash">
            {campaign.serviceLabel}
            {campaign.platform ? ` · ${campaign.platform}` : ""}
          </span>
        </div>
        <ClientStatusBadge label={CAMPAIGN_STATUS_LABEL[campaign.status]} tone={tone} />
      </div>

      {(campaign.startDate || campaign.endDate) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 font-body text-xs text-ash">
          {campaign.startDate && <span>Start {formatDateTime(campaign.startDate)}</span>}
          {campaign.endDate && <span>End {formatDateTime(campaign.endDate)}</span>}
        </div>
      )}

      {(campaign.budget || campaign.spent || campaign.remaining) && (
        <div className="grid grid-cols-3 gap-2 font-body text-xs">
          {campaign.budget !== undefined && (
            <div className="flex flex-col">
              <span className="text-ash">Budget</span>
              <span className="text-bone">{formatINR(campaign.budget)}</span>
            </div>
          )}
          {campaign.spent !== undefined && (
            <div className="flex flex-col">
              <span className="text-ash">Spent</span>
              <span className="text-bone">{formatINR(campaign.spent)}</span>
            </div>
          )}
          {campaign.remaining !== undefined && (
            <div className="flex flex-col">
              <span className="text-ash">Remaining</span>
              <span className="text-bone">{formatINR(campaign.remaining)}</span>
            </div>
          )}
        </div>
      )}

      {typeof campaign.progress === "number" && <ProgressBar value={campaign.progress} label="Progress" />}
    </Link>
  );
}
