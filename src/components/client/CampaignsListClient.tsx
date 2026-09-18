"use client";

import { useMemo, useState } from "react";
import type { ClientCampaign } from "@/shared/types/campaign";
import { CAMPAIGN_STATUS_LABEL } from "@/shared/types/campaign";
import CampaignCard from "@/components/client/CampaignCard";
import FilterBar, { type FilterBarValue } from "@/components/client/FilterBar";
import EmptyState from "@/components/client/EmptyState";
import ClientSection from "@/components/client/ClientSection";

export default function CampaignsListClient({ campaigns }: { campaigns: ClientCampaign[] }) {
  const [filter, setFilter] = useState<FilterBarValue>({ status: "", service: "", search: "" });

  const serviceOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of campaigns) seen.set(c.serviceId, c.serviceLabel);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [campaigns]);

  const filtered = campaigns.filter((c) => {
    if (filter.status && c.status !== filter.status) return false;
    if (filter.service && c.serviceId !== filter.service) return false;
    if (filter.search && !c.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const running = filtered.filter((c) => c.status === "live" || c.status === "optimizing");
  const other = filtered.filter((c) => c.status !== "live" && c.status !== "optimizing");

  if (campaigns.length === 0) {
    return <EmptyState message="Your campaigns will appear here once they are created." />;
  }

  return (
    <div className="flex flex-col gap-8">
      <FilterBar
        statusOptions={Object.entries(CAMPAIGN_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
        serviceOptions={serviceOptions}
        value={filter}
        onChange={setFilter}
        searchPlaceholder="Search campaigns…"
      />

      <ClientSection title="Running Campaigns">
        {running.length === 0 ? (
          <EmptyState message="There are currently no active campaigns." />
        ) : (
          <ul className="flex flex-col gap-2">
            {running.map((c) => (
              <li key={c.id}>
                <CampaignCard campaign={c} />
              </li>
            ))}
          </ul>
        )}
      </ClientSection>

      {other.length > 0 && (
        <ClientSection title="Other Campaigns">
          <ul className="flex flex-col gap-2">
            {other.map((c) => (
              <li key={c.id}>
                <CampaignCard campaign={c} />
              </li>
            ))}
          </ul>
        </ClientSection>
      )}
    </div>
  );
}
