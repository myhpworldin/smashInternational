import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getClientEvents } from "@/server/services/clientEvents.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ActivityTimeline from "@/components/client/ActivityTimeline";

const ACTIVITY_LIMIT = 50;

// Stage 1 Phase 15 §9 — the full history behind the dashboard's "Recent
// Activity" (which only shows the latest 10). Same real events, same
// component, just a longer list — reuses getClientEvents rather than a
// second derivation.
export default async function ActivityPage() {
  const { doc } = await resolveOnboardingIdentity();
  const events = await getClientEvents(doc.clientId, ACTIVITY_LIMIT);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Communication" title="Activity" />
      <ActivityTimeline items={events} />
    </div>
  );
}
