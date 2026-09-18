import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { listProjectsForClient } from "@/server/services/projects.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ProjectsListClient from "@/components/client/ProjectsListClient";

export default async function ProjectsPage() {
  const { doc } = await resolveOnboardingIdentity();
  const projects = await listProjectsForClient(doc.clientId);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Work" title="Projects" />
      <ProjectsListClient projects={projects} />
    </div>
  );
}
