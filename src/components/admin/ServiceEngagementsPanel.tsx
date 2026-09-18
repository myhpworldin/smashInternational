"use client";

import { useState } from "react";
import type { ServiceEngagementRow, ServiceEngagementStatus } from "@/shared/types/serviceEngagement";
import { SERVICE_ENGAGEMENT_STATUS_LABEL, getValidNextStatuses } from "@/shared/types/serviceEngagement";
import { formatDateTime } from "@/lib/format/date";

// Stage 1 Phase 4 — the admin-facing counterpart to AssignmentsPanel
// (which answers "who on staff operates this service"); this one answers
// "what lifecycle state is this service itself in." Two separate panels
// for two separate concepts, same as their backing collections.
export default function ServiceEngagementsPanel({
  initialEngagements,
}: {
  initialEngagements: ServiceEngagementRow[];
}) {
  const [engagements, setEngagements] = useState(initialEngagements);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Record<string, ServiceEngagementStatus>>({});
  const [error, setError] = useState<string | null>(null);

  if (engagements.length === 0) {
    return (
      <p className="font-body text-sm text-ash">
        No service engagements yet — these are created automatically when this onboarding is approved.
      </p>
    );
  }

  const handleUpdate = async (engagementId: string) => {
    const nextStatus = selectedStatus[engagementId];
    if (!nextStatus || pendingId) return;
    setPendingId(engagementId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/service-engagements/${engagementId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.errors?.join(" ") ?? data?.message ?? "Couldn't update this service's status.");
        return;
      }

      setEngagements((prev) =>
        prev.map((e) => (e.id === engagementId ? (data.engagement as ServiceEngagementRow) : e)),
      );
      setSelectedStatus((prev) => ({ ...prev, [engagementId]: undefined as unknown as ServiceEngagementStatus }));
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {engagements.map((engagement) => {
          const nextOptions = getValidNextStatuses(engagement.status);
          return (
            <li
              key={engagement.id}
              className="flex flex-col gap-2 border border-white/15 bg-carbon p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-sm text-bone">{engagement.serviceLabel}</span>
                <span className="font-body text-xs text-ash">
                  <span className="text-bone">{SERVICE_ENGAGEMENT_STATUS_LABEL[engagement.status]}</span> · since{" "}
                  {formatDateTime(engagement.approvedAt ?? engagement.requestedAt)}
                </span>
              </div>

              {nextOptions.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={selectedStatus[engagement.id] ?? ""}
                    onChange={(e) =>
                      setSelectedStatus((prev) => ({
                        ...prev,
                        [engagement.id]: e.target.value as ServiceEngagementStatus,
                      }))
                    }
                    className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone focus-visible:-outline-offset-2"
                  >
                    <option value="">Change status…</option>
                    {nextOptions.map((status) => (
                      <option key={status} value={status}>
                        {SERVICE_ENGAGEMENT_STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleUpdate(engagement.id)}
                    disabled={!selectedStatus[engagement.id] || pendingId === engagement.id}
                    className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
                  >
                    {pendingId === engagement.id ? "Saving" : "Apply"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
