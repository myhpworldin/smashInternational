"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientProject, ClientProjectStatus, MilestoneStatus } from "@/shared/types/project";
import { PROJECT_STATUS_LABEL } from "@/shared/types/project";
import { saveProject } from "@/lib/admin-actions/operations";

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABEL) as [ClientProjectStatus, string][];
const MILESTONE_STATUS_OPTIONS: MilestoneStatus[] = ["pending", "in_progress", "completed"];

// Stage 1 Phase 13 §10/§14 — every field here is the CLIENT-VISIBLE
// project record from Phase 9 (shared/types/project.ts) — there is no
// internal-only field mixed in, so nothing entered here risks leaking
// staff-only detail to the client-facing project page that reads the
// same shape. Reuses the client lifecycle (PROJECT_STATUS_LABEL) rather
// than inventing a second, admin-only status vocabulary that could
// disagree with what the client sees.
export default function AdminProjectsPanel({
  clientId,
  serviceOptions,
  projects,
}: {
  clientId: string;
  serviceOptions: { id: string; label: string; engagementId: string }[];
  projects: ClientProject[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const handleCreated = () => {
    setShowForm(false);
    // Stage 1 Phase 17 — the project now really was saved (POST
    // /api/admin/projects); refresh this server-rendered page so the new
    // record appears in the list above without a manual reload.
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {projects.length === 0 ? (
        <p className="font-body text-sm text-ash">No projects have been created for this client yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between border border-white/15 p-3">
              <span className="font-body text-sm text-bone">{p.name}</span>
              <span className="font-body text-xs text-ash">{PROJECT_STATUS_LABEL[p.status]}</span>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <ProjectForm clientId={clientId} serviceOptions={serviceOptions} onDone={handleCreated} />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={serviceOptions.length === 0}
          title={serviceOptions.length === 0 ? "This client has no approved services yet" : undefined}
          className="self-start rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          Create Project
        </button>
      )}
    </div>
  );
}

function ProjectForm({
  clientId,
  serviceOptions,
  onDone,
}: {
  clientId: string;
  serviceOptions: { id: string; label: string; engagementId: string }[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState(serviceOptions[0]?.id ?? "");
  const [status, setStatus] = useState<ClientProjectStatus>("planning");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [progress, setProgress] = useState("");
  const [description, setDescription] = useState("");
  const [milestones, setMilestones] = useState<{ name: string; status: MilestoneStatus }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMilestone = () => setMilestones((prev) => [...prev, { name: "", status: "pending" }]);
  const updateMilestone = (index: number, patch: Partial<{ name: string; status: MilestoneStatus }>) =>
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  const removeMilestone = (index: number) => setMilestones((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (name.trim().length === 0) {
      setError("Enter a project name.");
      return;
    }
    if (!serviceId) {
      setError("Select a service.");
      return;
    }
    if (startDate && targetEndDate && targetEndDate < startDate) {
      setError("Expected completion cannot be before the start date.");
      return;
    }
    const progressNum = progress === "" ? undefined : Number(progress);
    if (progressNum !== undefined && (Number.isNaN(progressNum) || progressNum < 0 || progressNum > 100)) {
      setError("Progress must be a number between 0 and 100.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const selectedOption = serviceOptions.find((s) => s.id === serviceId);
    if (!selectedOption) {
      setError("Select a service.");
      return;
    }

    const result = await saveProject({
      clientId,
      serviceEngagementId: selectedOption.engagementId,
      name: name.trim(),
      status,
      startDate: startDate || undefined,
      targetEndDate: targetEndDate || undefined,
      progress: progressNum,
      description: description.trim() || undefined,
      milestones,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border border-white/15 p-4">
      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      <Field label="Project name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </Field>

      <Field label="Service">
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        >
          {serviceOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Status (client-visible)">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ClientProjectStatus)}
          className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Start date">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </Field>
        <Field label="Expected completion">
          <input
            type="date"
            value={targetEndDate}
            onChange={(e) => setTargetEndDate(e.target.value)}
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </Field>
      </div>

      <Field label="Progress % (client-visible)">
        <input
          type="number"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </Field>

      <Field label="Client-visible description">
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-y rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="font-body text-xs text-ash uppercase">Milestones (client-visible)</span>
        {milestones.map((m, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={m.name}
              onChange={(e) => updateMilestone(i, { name: e.target.value })}
              placeholder="Milestone name"
              className="flex-1 rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
            />
            <select
              value={m.status}
              onChange={(e) => updateMilestone(i, { status: e.target.value as MilestoneStatus })}
              className="rounded-none border border-white/15 bg-void px-2 py-2 font-body text-xs text-bone focus-visible:-outline-offset-2"
            >
              {MILESTONE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeMilestone(i)}
              aria-label={`Remove milestone ${i + 1}`}
              className="font-body text-xs text-ash underline hover:text-bone"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addMilestone}
          className="self-start font-body text-xs text-ash underline hover:text-bone"
        >
          + Add milestone
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="rounded-none bg-white px-4 py-2 font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {submitting ? "Saving" : "Save Project"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-xs text-ash uppercase">{label}</span>
      {children}
    </label>
  );
}
