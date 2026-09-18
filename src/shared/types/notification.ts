// A dedicated, single event type for this phase — Phase 1's audit found
// no notification system in this project at all (the only prior thing
// called a "notification" was an unrelated marketing waitlist capture),
// so there is nothing pre-existing to reuse the naming convention of.
// This is deliberately the minimal real schema Phase 2's audit already
// sketched (§13/§18): more types can be added to this union later without
// touching the shape below.
export type NotificationType = "service_assignment_transferred";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  assignmentId: string;
  onboardingId: string;
  serviceId: string;
  read: boolean;
  createdAt: string;
};
