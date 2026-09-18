import Link from "next/link";
import type { ServiceEngagementRow } from "@/shared/types/serviceEngagement";
import { SERVICE_ENGAGEMENT_STATUS_LABEL } from "@/shared/types/serviceEngagement";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import { formatDateTime } from "@/lib/format/date";

const POSITIVE_STATUSES = new Set(["active"]);
const ATTENTION_STATUSES = new Set(["on_hold", "paused"]);

// Stage 1 Phase 5 §11/§33 — takes the real ServiceEngagementRow shape
// (Phase 3/4), never individual name/status props, so a later phase that
// adds fields (progress, campaign count…) only ever changes this file and
// the type, not every call site. Links to the service-detail foundation
// (§12); no project/campaign counts shown yet since neither exists.
export default function ServiceCard({ engagement }: { engagement: ServiceEngagementRow }) {
  const tone = POSITIVE_STATUSES.has(engagement.status)
    ? "positive"
    : ATTENTION_STATUSES.has(engagement.status)
      ? "attention"
      : "neutral";

  return (
    <Link
      href={`/dashboard/services/${engagement.id}`}
      className="flex items-center justify-between gap-3 border border-carbon p-4 transition-colors duration-150 hover:border-white/30 focus-visible:-outline-offset-2"
    >
      <div className="flex flex-col gap-1">
        <span className="font-body text-sm text-bone">{engagement.serviceLabel}</span>
        <span className="font-body text-xs text-ash">
          Since {formatDateTime(engagement.approvedAt ?? engagement.requestedAt)}
        </span>
      </div>
      <ClientStatusBadge label={SERVICE_ENGAGEMENT_STATUS_LABEL[engagement.status]} tone={tone} />
    </Link>
  );
}
