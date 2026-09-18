"use client";

import { useState } from "react";
import { METRIC_LABEL, type PerformanceMetrics } from "@/shared/types/performance";
import { getMetricGroup } from "@/lib/performance/metricGroups";
import { getServiceById } from "@/shared/config/services";
import { savePerformanceEntry } from "@/lib/admin-actions/operations";
import { formatDateTime } from "@/lib/format/date";

// Stage 1 Phase 13 §15-18 — the reusable performance-entry UI foundation.
// `reportingDate` and the eventual `updatedAt` are kept conceptually
// separate throughout (§17): this form only ever sets reportingDate (what
// the numbers describe); "last updated" is something a future backend
// stamps on write, and editing a past entry must never move its
// reportingDate — this component doesn't let it, since reportingDate is
// the record's own identity, not something a later edit exposes a field
// for.
export default function AdminPerformanceEntryPanel({
  clientId,
  serviceOptions,
}: {
  clientId: string;
  serviceOptions: { id: string; label: string }[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-sm text-ash">No performance records have been entered for this client yet.</p>

      {showForm ? (
        <EntryForm clientId={clientId} serviceOptions={serviceOptions} onDone={() => setShowForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={serviceOptions.length === 0}
          title={serviceOptions.length === 0 ? "This client has no approved services yet" : undefined}
          className="self-start rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          Add Performance Entry
        </button>
      )}
    </div>
  );
}

function EntryForm({
  clientId,
  serviceOptions,
  onDone,
}: {
  clientId: string;
  serviceOptions: { id: string; label: string }[];
  onDone: () => void;
}) {
  const [serviceId, setServiceId] = useState(serviceOptions[0]?.id ?? "");
  const [reportingDate, setReportingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<Partial<Record<keyof PerformanceMetrics, string>>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const category = getServiceById(serviceId)?.category;
  const metricKeys = category ? getMetricGroup(serviceId, category) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!serviceId) {
      setError("Select a service.");
      return;
    }
    if (!reportingDate) {
      setError("Select a reporting date.");
      return;
    }

    const metrics: Partial<Record<keyof PerformanceMetrics, number>> = {};
    for (const key of metricKeys) {
      const raw = values[key];
      if (raw === undefined || raw === "") continue;
      const num = Number(raw);
      if (Number.isNaN(num) || num < 0) {
        setError(`${METRIC_LABEL[key]} must be a non-negative number.`);
        return;
      }
      metrics[key] = num;
    }

    setSubmitting(true);
    setError(null);
    const result = await savePerformanceEntry({
      clientId,
      serviceId,
      reportingDate,
      metrics,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    setSubmittedAt(new Date().toISOString());
  };

  if (submittedAt) {
    return (
      <div className="flex flex-col gap-2 border border-white/15 p-4">
        <p className="font-body text-sm text-bone">Reporting date: {formatDateTime(reportingDate)}</p>
        <p className="font-body text-xs text-ash">Last updated: {formatDateTime(submittedAt)}</p>
        <button type="button" onClick={onDone} className="self-start font-body text-xs text-ash underline hover:text-bone">
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border border-white/15 p-4">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-ash uppercase">Reporting date</span>
          <input
            type="date"
            value={reportingDate}
            onChange={(e) => setReportingDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </label>
      </div>

      {metricKeys.length === 0 ? (
        <p className="font-body text-sm text-ash">
          This service is tracked through Projects, not performance metrics.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metricKeys.map((key) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="font-body text-xs text-ash uppercase">{METRIC_LABEL[key]}</span>
              <input
                type="number"
                min={0}
                value={values[key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
              />
            </label>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-body text-xs text-ash uppercase">Notes (client-visible)</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="resize-y rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="rounded-none bg-white px-4 py-2 font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {submitting ? "Saving" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-none border border-white/15 bg-carbon px-4 py-2 font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
