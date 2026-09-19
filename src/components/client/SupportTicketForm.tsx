"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SupportTicketPriority } from "@/shared/types/supportTicket";
import { createSupportTicket } from "@/lib/client-actions/support";

const PRIORITY_OPTIONS: SupportTicketPriority[] = ["low", "medium", "high"];

// Stage 1 Phase 15 §21, wired to a real backend Phase 23 — a fully
// validated ticket-creation form calling createSupportTicket, which now
// really persists the ticket (§21: "prevent empty or meaningless
// submissions" is still enforced client-side first either way).
export default function SupportTicketForm({
  serviceOptions,
}: {
  serviceOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [serviceId, setServiceId] = useState(serviceOptions[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (subject.trim().length === 0) {
      setError("Enter a subject.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Describe the issue in at least a few words.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createSupportTicket({
      subject: subject.trim(),
      serviceId: serviceId || undefined,
      description: description.trim(),
      priority,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    setSubmitted(true);
    router.refresh();
  };

  if (submitted) {
    return <p className="font-body text-sm text-bone">Your support ticket has been submitted.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border border-carbon p-4">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-body text-xs text-ash uppercase">Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </label>

      {serviceOptions.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-ash uppercase">Service</span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          >
            {serviceOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-body text-xs text-ash uppercase">Priority</span>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
          className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-body text-xs text-ash uppercase">Description</span>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="resize-y rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="self-start rounded-none bg-white px-[18px] py-[14px] font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
      >
        {submitting ? "Submitting" : "Create Ticket"}
      </button>
    </form>
  );
}
