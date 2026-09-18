import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { listNotificationsForClient } from "@/server/services/clientNotifications.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import NotificationsListClient from "@/components/client/NotificationsListClient";

export default async function NotificationsPage() {
  const { doc } = await resolveOnboardingIdentity();
  const notifications = await listNotificationsForClient(doc.clientId);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Communication" title="Notifications" />
      <NotificationsListClient notifications={notifications} />
    </div>
  );
}
