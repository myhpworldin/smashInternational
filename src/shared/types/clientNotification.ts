// Stage 1 Phase 15 — the client notification-center contract, separate
// from shared/types/notification.ts (that one is staff-only, scoped to
// service-assignment handovers — a different audience and event set
// entirely). Every type here is a client-safe business event; nothing
// here can ever carry internal-only detail because the adapter that
// produces these (clientNotifications.service.ts) only ever reads from
// already-client-safe sources (the same statusHistory feed Recent
// Activity already uses).
export type ClientNotificationType =
  | "onboarding_status_changed"
  | "service_status_changed"
  | "approval_requested"
  | "report_available"
  | "document_added"
  | "budget_request_status_changed"
  | "message_received"
  | "support_ticket_updated"
  // Stage 1 Phase 22 — additive: "a deliverable is ready for review" has
  // no equivalent among the types above (approval_requested is a
  // different event — an approval being sent for review, not a
  // deliverable's own status reaching ready-for-review independent of
  // any approval).
  | "deliverable_ready";

export type ClientNotification = {
  id: string;
  type: ClientNotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  href: string;
};
