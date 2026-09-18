"use client";

import { useMemo, useState } from "react";
import type { ClientProject } from "@/shared/types/project";
import { PROJECT_STATUS_LABEL } from "@/shared/types/project";
import ProjectCard from "@/components/client/ProjectCard";
import FilterBar, { type FilterBarValue } from "@/components/client/FilterBar";
import EmptyState from "@/components/client/EmptyState";
import ClientSection from "@/components/client/ClientSection";

const ACTIVE_STATUSES = new Set(["planning", "in_progress", "client_review", "changes_requested", "on_hold"]);

export default function ProjectsListClient({ projects }: { projects: ClientProject[] }) {
  const [filter, setFilter] = useState<FilterBarValue>({ status: "", service: "", search: "" });

  const serviceOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of projects) seen.set(p.serviceId, p.serviceLabel);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [projects]);

  const filtered = projects.filter((p) => {
    if (filter.status && p.status !== filter.status) return false;
    if (filter.service && p.serviceId !== filter.service) return false;
    if (filter.search && !p.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const active = filtered.filter((p) => ACTIVE_STATUSES.has(p.status));
  const completed = filtered.filter((p) => !ACTIVE_STATUSES.has(p.status));

  if (projects.length === 0) {
    return <EmptyState message="You don't have any projects available yet." />;
  }

  return (
    <div className="flex flex-col gap-8">
      <FilterBar
        statusOptions={Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
        serviceOptions={serviceOptions}
        value={filter}
        onChange={setFilter}
        searchPlaceholder="Search projects…"
      />

      <ClientSection title="Active Projects">
        {active.length === 0 ? (
          <EmptyState message="No active projects match your filters." />
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        )}
      </ClientSection>

      {completed.length > 0 && (
        <ClientSection title="Completed Projects">
          <ul className="flex flex-col gap-2">
            {completed.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        </ClientSection>
      )}
    </div>
  );
}
