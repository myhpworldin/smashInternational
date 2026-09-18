import { verifySession } from "@/server/auth/dal";
import { listActiveAssignmentsForStaff } from "@/server/services/serviceAssignments.service";
import { listNotificationsForStaff } from "@/server/services/notifications.service";
import { formatDateTime } from "@/lib/format/date";
import StaffNotifications from "@/components/staff/StaffNotifications";

// Read-only for now — accepting/updating an assignment, notes, tasks etc.
// are all future-phase work (see staff/layout.tsx's comment). This page
// exists to prove the access-control primitive end-to-end: an assignment
// only shows up here while its status is "active," and disappears the
// instant an admin marks this staff member unavailable/departed.
export default async function StaffHomePage() {
  const session = await verifySession();
  const assignments = session ? await listActiveAssignmentsForStaff(session.userId) : [];
  const notifications = session ? await listNotificationsForStaff(session.userId) : [];

  return (
    <main className="flex flex-col gap-8 px-6 py-10 md:px-10">
      <div className="flex flex-col gap-3">
        <h2 className="font-body text-xs tracking-[0.14em] text-ash uppercase">Notifications</h2>
        <StaffNotifications initialNotifications={notifications} />
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-xl text-bone md:text-2xl">Your assignments</h1>
          <p className="mt-1 font-body text-sm text-ash">
            Services currently assigned to you. If one moves to handover, it will no longer appear here.
          </p>
        </div>

        {assignments.length === 0 ? (
          <p className="font-body text-sm text-ash">No active assignments right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {assignments.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 border border-white/15 bg-carbon p-4">
                <span className="font-body text-sm text-bone">{a.serviceLabel}</span>
                <span className="font-body text-xs text-ash">{a.clientCompanyName}</span>
                <span className="font-body text-xs text-ash">Assigned {formatDateTime(new Date(a.assignedAt))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
