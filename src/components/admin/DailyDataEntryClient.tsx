"use client";

import { useMemo, useState } from "react";
import type { ServiceCategoryId } from "@/shared/config/services";
import type { ClientProject } from "@/shared/types/project";
import type { ClientCampaign } from "@/shared/types/campaign";
import type { DailyPerformanceRecord } from "@/shared/types/dailyRecord";
import { METRIC_LABEL, type PerformanceMetrics } from "@/shared/types/performance";
import { getMetricGroup } from "@/lib/performance/metricGroups";
import { saveDailyRecord } from "@/lib/admin-actions/operations";
import { formatDateTime } from "@/lib/format/date";

export type ClientDataEntryOption = {
  clientId: string;
  companyName: string;
  contactPerson?: string;
  services: { id: string; label: string; category: ServiceCategoryId }[];
  projects: ClientProject[];
  campaigns: ClientCampaign[];
  dailyRecords: DailyPerformanceRecord[];
};

const PROJECT_CATEGORIES: ServiceCategoryId[] = ["creative", "technology"];
const today = () => new Date().toISOString().slice(0, 10);

// Stage 1 Phase 14 — the full cascading context-selection + entry
// workflow (§3/§23): client → service → campaign/project → reporting
// date, each step clearing whatever depended on the one before it so
// stale selections never survive a change. "Existing record found" is a
// real lookup against the client's own already-fetched dailyRecords
// array (always empty today, since no backend exists) rather than a
// fixture — the exact same check will start finding real records the
// moment a backend phase populates listDailyRecordsForClient.
export default function DailyDataEntryClient({ clients }: { clients: ClientDataEntryOption[] }) {
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [contextId, setContextId] = useState<string | null>(null); // campaign or project id, or "__none__"
  const [reportingDate, setReportingDate] = useState(today());

  const filteredClients = clients.filter((c) => c.companyName.toLowerCase().includes(search.toLowerCase()));
  const client = clients.find((c) => c.clientId === clientId) ?? null;
  const service = client?.services.find((s) => s.id === serviceId) ?? null;
  const isProjectBased = service ? PROJECT_CATEGORIES.includes(service.category) : false;

  const contextOptions = useMemo(() => {
    if (!client || !service) return [];
    return isProjectBased
      ? client.projects.filter((p) => p.serviceId === service.id).map((p) => ({ id: p.id, label: p.name }))
      : client.campaigns.filter((c) => c.serviceId === service.id).map((c) => ({ id: c.id, label: c.name }));
  }, [client, service, isProjectBased]);

  const existingRecord = useMemo(() => {
    if (!client || !service) return null;
    return (
      client.dailyRecords.find(
        (r) =>
          r.serviceId === service.id &&
          (r.campaignOrProjectId ?? "__none__") === (contextId ?? "__none__") &&
          r.reportingDate === reportingDate,
      ) ?? null
    );
  }, [client, service, contextId, reportingDate]);

  const handleSelectClient = (id: string) => {
    setClientId(id);
    setServiceId(null);
    setContextId(null);
  };

  const handleSelectService = (id: string) => {
    setServiceId(id);
    setContextId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border border-white/15 p-4">
        <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">Context</p>

        <Field label="Client">
          {clientId && client ? (
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-sm text-bone">{client.companyName}</span>
              <button
                type="button"
                onClick={() => handleSelectClient("")}
                className="font-body text-xs text-ash underline hover:text-bone"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
              />
              <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                {filteredClients.map((c) => (
                  <li key={c.clientId}>
                    <button
                      type="button"
                      onClick={() => handleSelectClient(c.clientId)}
                      className="w-full rounded-none border border-white/15 bg-void px-3 py-2 text-left font-body text-sm text-bone hover:border-white/30 focus-visible:-outline-offset-2"
                    >
                      {c.companyName}
                      {c.contactPerson && <span className="text-ash"> · {c.contactPerson}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Field>

        {client && (
          <Field label="Service">
            {client.services.length === 0 ? (
              <p className="font-body text-sm text-ash">This client has no approved services yet.</p>
            ) : (
              <select
                value={serviceId ?? ""}
                onChange={(e) => handleSelectService(e.target.value)}
                className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
              >
                <option value="">Select a service…</option>
                {client.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        {service && contextOptions.length > 0 && (
          <Field label={isProjectBased ? "Project" : "Campaign"}>
            <select
              value={contextId ?? ""}
              onChange={(e) => setContextId(e.target.value || null)}
              className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
            >
              <option value="">{`Select a ${isProjectBased ? "project" : "campaign"}…`}</option>
              {contextOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {service && contextOptions.length === 0 && (
          <p className="font-body text-xs text-ash">
            No {isProjectBased ? "projects" : "campaigns"} exist yet for this service — data will be recorded
            against the service directly.
          </p>
        )}

        {service && (
          <Field label="Reporting date">
            <input
              type="date"
              value={reportingDate}
              max={today()}
              onChange={(e) => setReportingDate(e.target.value)}
              className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
            />
          </Field>
        )}
      </div>

      {service && (
        <div className="border border-white/15 p-4">
          {existingRecord ? (
            <div className="flex flex-col gap-1">
              <p className="font-body text-sm text-bone">Existing Data Found</p>
              <p className="font-body text-xs text-ash">Reporting date: {formatDateTime(existingRecord.reportingDate)}</p>
              <p className="font-body text-xs text-ash">
                Last updated: {formatDateTime(existingRecord.updatedAt)} · {existingRecord.updatedByName}
              </p>
            </div>
          ) : (
            <p className="font-body text-sm text-ash">
              No existing record found for {formatDateTime(reportingDate)} — you&apos;ll be creating a new entry.
            </p>
          )}
        </div>
      )}

      {client && service && (
        <EntryForm
          key={`${client.clientId}-${service.id}-${contextId}-${reportingDate}`}
          clientId={client.clientId}
          serviceId={service.id}
          category={service.category}
          campaignOrProjectId={contextId}
          reportingDate={reportingDate}
          existingRecord={existingRecord}
        />
      )}

      {client && (
        <RecordHistory records={client.dailyRecords} />
      )}
    </div>
  );
}

function EntryForm({
  clientId,
  serviceId,
  category,
  campaignOrProjectId,
  reportingDate,
  existingRecord,
}: {
  clientId: string;
  serviceId: string;
  category: ServiceCategoryId;
  campaignOrProjectId: string | null;
  reportingDate: string;
  existingRecord: DailyPerformanceRecord | null;
}) {
  const isProjectBased = PROJECT_CATEGORIES.includes(category);
  const metricKeys = isProjectBased ? [] : getMetricGroup(serviceId, category);

  const [values, setValues] = useState<Partial<Record<keyof PerformanceMetrics, string>>>(
    () =>
      Object.fromEntries(
        Object.entries(existingRecord?.metrics ?? {}).map(([k, v]) => [k, String(v)]),
      ) as Partial<Record<keyof PerformanceMetrics, string>>,
  );
  const [progress, setProgress] = useState(existingRecord?.projectProgress?.overallProgress?.toString() ?? "");
  const [status, setStatus] = useState(existingRecord?.projectProgress?.status ?? "");
  const [notes, setNotes] = useState(existingRecord?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const metrics: Partial<Record<keyof PerformanceMetrics, number>> = {};
    for (const key of metricKeys) {
      const raw = values[key];
      if (!raw) continue;
      const num = Number(raw);
      if (Number.isNaN(num) || num < 0) {
        setError(`${METRIC_LABEL[key]} must be a non-negative number.`);
        return;
      }
      if (key === "ctr" || key === "conversionRate" || key === "engagementRate") {
        if (num > 100) {
          setError(`${METRIC_LABEL[key]} cannot exceed 100%.`);
          return;
        }
      }
      metrics[key] = num;
    }

    const progressNum = progress === "" ? undefined : Number(progress);
    if (progressNum !== undefined && (Number.isNaN(progressNum) || progressNum < 0 || progressNum > 100)) {
      setError("Progress must be between 0 and 100.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await saveDailyRecord({
      clientId,
      serviceId,
      campaignOrProjectId,
      reportingDate,
      metrics,
      projectProgress: isProjectBased ? { overallProgress: progressNum, status: status || undefined } : undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="flex flex-col gap-2 border border-white/15 p-4">
        <p className="font-body text-sm text-bone">
          {existingRecord ? "Record updated." : "Record saved."} Reporting date: {formatDateTime(reportingDate)}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border border-white/15 p-4">
      <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">
        {existingRecord ? `Editing existing record for ${formatDateTime(reportingDate)}` : "New entry"}
      </p>

      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      {isProjectBased ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-body text-xs text-ash uppercase">Overall progress %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-body text-xs text-ash uppercase">Status</span>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="e.g. In Progress"
              className="rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
            />
          </label>
        </div>
      ) : metricKeys.length === 0 ? (
        <p className="font-body text-sm text-ash">No metrics are defined for this service yet.</p>
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
        <span className="font-body text-xs text-ash uppercase">Daily update / client-visible note</span>
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
          className="self-start rounded-none bg-white px-4 py-2 font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {submitting ? "Saving" : existingRecord ? "Save Update" : "Save"}
        </button>
      </div>
    </form>
  );
}

function RecordHistory({ records }: { records: DailyPerformanceRecord[] }) {
  if (records.length === 0) {
    return <p className="font-body text-sm text-ash">No daily records have been entered for this client yet.</p>;
  }

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse font-body text-sm">
        <thead>
          <tr className="border-b border-carbon text-left text-xs tracking-[0.1em] text-ash uppercase">
            <th className="py-2 pr-4">Service</th>
            <th className="py-2 pr-4">Reporting Date</th>
            <th className="py-2 pr-4">Last Updated</th>
            <th className="py-2 pr-4">Updated By</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-carbon/60 text-bone">
              <td className="py-3 pr-4">{r.serviceLabel}</td>
              <td className="py-3 pr-4 text-ash">{formatDateTime(r.reportingDate)}</td>
              <td className="py-3 pr-4 text-ash">{formatDateTime(r.updatedAt)}</td>
              <td className="py-3 pr-4 text-ash">{r.updatedByName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-xs text-ash uppercase">{label}</span>
      {children}
    </label>
  );
}
