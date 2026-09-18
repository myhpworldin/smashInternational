"use client";

import { useState } from "react";
import type { AdminUserRow } from "@/shared/types/adminUser";
import { STAFF_AVAILABILITY_LABEL, STAFF_AVAILABILITY_VALUES } from "@/shared/types/adminUser";
import type { StaffAvailability } from "@/shared/types/user";
import Modal from "./Modal";

export type AvailabilityConfirmResult =
  | { ok: true; affectedAssignmentIds: string[] }
  | { ok: false; errors: string[] };

// Mirrors ConfirmActionDialog's shape, but needs its own select control
// (not a fixed two-option toggle) plus the "N active assignments will be
// marked for handover" explanation the spec calls for — so it isn't just
// ConfirmActionDialog with children, it owns its own state transition.
export default function StaffAvailabilityDialog({
  open,
  onClose,
  user,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUserRow | null;
  onConfirm: (availability: StaffAvailability, reason: string) => Promise<AvailabilityConfirmResult>;
}) {
  const [wasOpen, setWasOpen] = useState(open);
  const [availability, setAvailability] = useState<StaffAvailability>(user?.availability ?? "available");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && user) {
      setAvailability(user.availability ?? "available");
      setReason("");
      setError(null);
    }
  }

  if (!user) return null;

  const movingToBlocking = availability !== "available" && (user.availability ?? "available") === "available";

  const handleConfirm = async () => {
    if (submitting || availability === (user.availability ?? "available")) return;
    setSubmitting(true);
    setError(null);
    const result = await onConfirm(availability, reason.trim());
    setSubmitting(false);
    if (!result.ok) {
      setError(result.errors.join(" "));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage availability">
      <p className="font-body text-sm text-bone">
        Current: <span className="text-ash">{STAFF_AVAILABILITY_LABEL[user.availability ?? "available"]}</span>
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">New availability for {user.name}</legend>
        {STAFF_AVAILABILITY_VALUES.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-2 border px-3 py-2 font-body text-sm transition-colors duration-150 ${
              availability === option ? "border-smash bg-smash-dim text-bone" : "border-white/15 bg-carbon text-bone"
            }`}
          >
            <input
              type="radio"
              name="availability"
              value={option}
              checked={availability === option}
              onChange={() => setAvailability(option)}
              className="accent-smash"
            />
            {STAFF_AVAILABILITY_LABEL[option]}
          </label>
        ))}
      </fieldset>

      {movingToBlocking && (
        <p className="border border-smash bg-smash-dim px-3 py-2 font-body text-xs text-bone">
          If this staff member has active service assignments, they will be marked for handover. Replacement staff
          are not chosen here — that happens separately.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="availability-reason" className="font-body text-xs text-ash uppercase">
          Reason (optional)
        </label>
        <input
          id="availability-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Resigned, effective 20 Sep"
          className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
      </div>

      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-none border border-white/15 bg-carbon px-[18px] py-[14px] font-body text-sm text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || availability === (user.availability ?? "available")}
          aria-busy={submitting}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {submitting ? "Saving" : "Save availability"}
        </button>
      </div>
    </Modal>
  );
}
