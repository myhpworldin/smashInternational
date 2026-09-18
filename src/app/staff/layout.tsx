import { requireRole } from "@/server/auth/dal";
import DashboardRail from "@/components/layout/DashboardRail";

// The staff-facing area is deliberately minimal for now (Staff Continuity
// Phase 2) — just enough for a staff account to log in somewhere real and
// see the work still assigned to them. The full staff dashboard (tasks,
// notes, client detail) is out of this phase's scope; see the Phase 1
// audit, §18 — none of that work-content infrastructure exists yet
// either.
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireRole("staff");

  return (
    <div className="min-h-dvh">
      <DashboardRail label="Staff" homeHref="/staff" />
      {children}
    </div>
  );
}
