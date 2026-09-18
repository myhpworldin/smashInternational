import { requireRole, getCurrentUser } from "@/server/auth/dal";
import { listNotificationsForClient } from "@/server/services/clientNotifications.service";
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
  // Section 7 of Phase 15: a single source of truth for the nav badge —
  // the same real, server-derived notification list the Notifications
  // page itself reads, not a separate counter that could disagree with
  // it. "Unread" here means "server has never seen it marked read" (no
  // backend persists that yet); the page's own sessionStorage-based
  // read-state is a separate, purely client-side UX layer on top.
  const notificationCount = user?.clientId ? (await listNotificationsForClient(user.clientId)).length : 0;

  return (
    <ClientPortalShell identityLabel={user?.email ?? ""} notificationCount={notificationCount}>
      {children}
    </ClientPortalShell>
  );
}
