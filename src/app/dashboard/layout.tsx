import { requireRole, getCurrentUser } from "@/server/auth/dal";
import { getUnreadCountForClient } from "@/server/services/clientNotifications.service";
import ClientPortalShell from "@/components/client/ClientPortalShell";

// Stage 1 Phase 2 — the client portal's real access gate, mirroring
// admin/layout.tsx and staff/layout.tsx exactly. requireRole redirects to
// /login for anyone without a valid, non-blocked "client" session, and to
// /force-password-change for one that still owes a mandatory password
// change — this replaced the mock, localStorage-only guard
// (ProtectedClientRoute) that used to be the only thing standing between
// an unauthenticated visitor and this route. Stage 1 Phase 6 removed that
// mock mechanism entirely (it was also incorrectly blocking anonymous
// visitors from /onboarding, which must stay reachable without login).
export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  await requireRole("client");
  const user = await getCurrentUser();
  // Section 7 of Phase 15, corrected Phase 23 — this used to count every
  // notification (`.length`), the only option before Phase 22 gave the
  // persisted notification types a real read/unread flag; that made the
  // nav badge show "how many notifications exist," not "how many are
  // unread," and it would only have grown as a client's history grew.
  // getUnreadCountForClient is the real unread count for those persisted
  // types (the two still-derived legacy types have no persisted
  // read-state to count against — see clientNotifications.service.ts).
  const notificationCount = user?.clientId ? await getUnreadCountForClient(user.clientId) : 0;

  return (
    <ClientPortalShell identityLabel={user?.email ?? ""} notificationCount={notificationCount}>
      {children}
    </ClientPortalShell>
  );
}
