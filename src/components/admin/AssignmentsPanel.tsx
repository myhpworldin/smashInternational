"use client";

import { useState } from "react";
import type { ServiceAssignmentRow } from "@/shared/types/serviceAssignment";
import { ASSIGNMENT_STATUS_LABEL } from "@/shared/types/serviceAssignment";
import type { AssignableStaffOption } from "@/server/services/adminUsers.service";
import { formatDateTime } from "@/lib/format/date";
import HandoverTransferControl from "@/components/admin/HandoverTransferControl";
import Toast from "@/components/admin/users/Toast";

// Create an assignment, see its status, and — once it's handover_required
// — transfer it to a validated replacement (Phase 3's individual-handover
// entry point; the bulk queue across every client lives at
// /admin/staff/[id]/handover and shares HandoverTransferControl with this
// component).
export default function AssignmentsPanel({
  onboardingId,
  companyName,
  services,
  initialAssignments,
  assignableStaff,
}: {
  onboardingId: string;
  companyName: string;
  services: { id: string; label: string }[];
  initialAssignments: ServiceAssignmentRow[];
  assignableStaff: AssignableStaffOption[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selectedStaffByService, setSelectedStaffByService] = useState<Record<string, string>>({});
  const [submittingService, setSubmittingService] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const byService = new Map(assignments.map((a) => [a.serviceId, a]));

  const refresh = async () => {
    const refreshed = await fetch(`/api/admin/service-assignments?onboardingId=${onboardingId}`);
    const refreshedData = await refreshed.json().catch(() => null);
    if (refreshedData?.ok) {
      setAssignments(refreshedData.records as ServiceAssignmentRow[]);
    }
  };

  const handleAssign = async (serviceId: string) => {
    const staffUserId = selectedStaffByService[serviceId];
    if (!staffUserId || submittingService) return;
    setSubmittingService(serviceId);
    setError(null);

    try {
      const response = await fetch("/api/admin/service-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingId, serviceId, staffUserId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setError(data?.errors?.join(" ") ?? "Couldn't create this assignment.");
        return;
      }
      await refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSubmittingService(null);
    }
  };

  if (services.length === 0) {
    return <p className="font-body text-sm text-ash">No services selected yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {services.map((service) => {
          const assignment = byService.get(service.id);
          return (
            <li key={service.id} className="flex flex-col gap-2 border border-white/15 bg-carbon p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-body text-sm text-bone">{service.label}</span>
                {assignment && (
                  <span
                    className={`border px-2 py-1 font-body text-xs uppercase ${
                      assignment.status === "handover_required"
                        ? "border-smash bg-smash-dim text-bone"
                        : "border-white/15 bg-void text-bone"
                    }`}
                  >
                    {ASSIGNMENT_STATUS_LABEL[assignment.status]}
                  </span>
                )}
              </div>

              {assignment ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-0.5 font-body text-xs text-ash">
                    <span>
                      {assignment.status === "handover_required" ? "Previously" : "Assigned to"} {assignment.staffName}
                      {assignment.staffEmail ? ` (${assignment.staffEmail})` : ""}
                    </span>
                    <span>Assigned {formatDateTime(new Date(assignment.assignedAt))}</span>
                    {assignment.status === "handover_required" && (
                      <span className="text-bone">
                        Eligible replacement staff: {assignment.eligibleReplacementCount ?? 0}
                        {assignment.handoverReason ? ` — Reason: ${assignment.handoverReason}` : ""}
                      </span>
                    )}
                  </div>

                  {assignment.status === "handover_required" && (
                    <HandoverTransferControl
                      assignmentId={assignment.id}
                      serviceLabel={service.label}
                      clientLabel={companyName}
                      currentStaffName={assignment.staffName}
                      eligibleStaff={assignableStaff}
                      onTransferred={(message) => {
                        setToastMessage(message);
                        void refresh();
                      }}
                    />
                  )}

                  {assignment.handoverHistory.length > 0 && (
                    <details className="font-body text-xs text-ash">
                      <summary className="cursor-pointer text-bone">Assignment history</summary>
                      <ul className="mt-1 flex flex-col gap-1">
                        {assignment.handoverHistory.map((h, i) => (
                          <li key={i}>
                            {h.fromStaffName} → {h.toStaffName} on {formatDateTime(new Date(h.completedAt))}
                            {h.reason ? ` — ${h.reason}` : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedStaffByService[service.id] ?? ""}
                    onChange={(e) =>
                      setSelectedStaffByService((prev) => ({ ...prev, [service.id]: e.target.value }))
                    }
                    className="w-full max-w-xs rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
                  >
                    <option value="">Select staff…</option>
                    {assignableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAssign(service.id)}
                    disabled={!selectedStaffByService[service.id] || submittingService === service.id}
                    className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
                  >
                    {submittingService === service.id ? "Assigning" : "Assign"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Toast message={toastMessage} onDone={() => setToastMessage(null)} />
    </div>
  );
}
