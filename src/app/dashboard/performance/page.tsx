import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getPerformanceForClient } from "@/server/services/performance.service";
import { listProjectsForClient } from "@/server/services/projects.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import PerformanceView from "@/components/client/PerformanceView";
import ProjectCard from "@/components/client/ProjectCard";
import EmptyState from "@/components/client/EmptyState";

// Stage 1 Phase 10 — marketing/lead performance (PerformanceView, backed
// by performance.service.ts, currently always empty — no backend exists)
// plus a Project Analysis section reusing Phase 9's ProjectCard as-is
// (§16 explicitly wants project progress/milestones here, and Phase 9
// already built the full project-detail experience — this just surfaces
// the same cards, not a second implementation of them).
export default async function PerformancePage() {
  const { doc } = await resolveOnboardingIdentity();
  const [snapshot, projects] = await Promise.all([
    getPerformanceForClient(doc.clientId),
    listProjectsForClient(doc.clientId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Performance" title="Performance" />

      <PerformanceView snapshot={snapshot} />

      <ClientSection title="Project Analysis">
        {projects.length === 0 ? (
          <EmptyState message="No project activity available yet." />
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        )}
      </ClientSection>
    </div>
  );
}
