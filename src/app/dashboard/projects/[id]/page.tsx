import { notFound } from "next/navigation";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getProjectForClient } from "@/server/services/projects.service";
import { PROJECT_STATUS_LABEL } from "@/shared/types/project";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import ProgressBar from "@/components/client/ProgressBar";
import MilestoneList from "@/components/client/MilestoneList";
import DeliverablesList from "@/components/client/DeliverablesList";
import ProjectTimelineView from "@/components/client/ProjectTimelineView";
import { FieldGrid, Field } from "@/components/client/FieldGrid";
import { formatDateTime } from "@/lib/format/date";

// Stage 1 Phase 9 §10 — ownership is enforced by getProjectForClient
// itself (same pattern as getEngagementForClient in Phase 5): a project
// id that exists but belongs to another client returns null here, same
// as one that doesn't exist at all, so this 404s either way rather than
// leaking which is which.
export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { doc } = await resolveOnboardingIdentity();
  const project = await getProjectForClient(id, doc.clientId);
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow={project.serviceLabel}
        title={project.name}
        action={<ClientStatusBadge label={PROJECT_STATUS_LABEL[project.status]} tone="positive" />}
      />

      <ClientSection title="Project overview">
        <div className="flex flex-col gap-4">
          <FieldGrid>
            <Field label="Related service" value={project.serviceLabel} />
            {project.startDate && <Field label="Start date" value={formatDateTime(project.startDate)} />}
            {project.targetEndDate && <Field label="Expected completion" value={formatDateTime(project.targetEndDate)} />}
            {project.completedDate && <Field label="Completed" value={formatDateTime(project.completedDate)} />}
          </FieldGrid>
          {project.description && <p className="font-body text-sm text-bone">{project.description}</p>}
          {typeof project.progress === "number" && <ProgressBar value={project.progress} label="Project Progress" />}
        </div>
      </ClientSection>

      <ClientSection title="Milestones">
        <MilestoneList milestones={project.milestones} />
      </ClientSection>

      <ClientSection title="Deliverables">
        <DeliverablesList deliverables={project.deliverables} />
      </ClientSection>

      <ClientSection title="Timeline">
        <ProjectTimelineView events={project.timeline} />
      </ClientSection>

      {project.latestUpdate && (
        <ClientSection title="Latest update">
          <div className="flex flex-col gap-1 border border-carbon p-4">
            <p className="font-body text-sm text-bone">{project.latestUpdate.message}</p>
            <p className="font-body text-xs text-ash">Updated {formatDateTime(project.latestUpdate.updatedAt)}</p>
          </div>
        </ClientSection>
      )}
    </div>
  );
}
