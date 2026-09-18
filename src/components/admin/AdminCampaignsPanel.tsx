"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientCampaign, ClientCampaignStatus } from "@/shared/types/campaign";
import { CAMPAIGN_STATUS_LABEL } from "@/shared/types/campaign";
import { saveCampaign } from "@/lib/admin-actions/operations";

const STATUS_OPTIONS = Object.entries(CAMPAIGN_STATUS_LABEL) as [ClientCampaignStatus, string][];

// Stage 1 Phase 13 §12/§13 — reuses the client-facing simplified
// lifecycle from Phase 9 (CAMPAIGN_STATUS_LABEL) rather than modeling the
// full internal workflow (Brief Created → Creative Required → …) this
// phase's spec describes: no backend/collection exists yet to actually
// track that extra internal-only detail, and inventing a second status
// vocabulary here with nothing behind it would just be UI for its own
// sake. The client only ever sees this same simplified lifecycle anyway.
export default function AdminCampaignsPanel({
  clientId,
  serviceOptions,
  campaigns,
}: {
  clientId: string;
  serviceOptions: { id: string; label: string; engagementId: string }[];
  campaigns: ClientCampaign[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const handleCreated = () => {
    setShowForm(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {campaigns.length === 0 ? (
        <p className="font-body text-sm text-ash">No campaigns have been created for this client yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {campaigns.map((c) => (
            <li key={c.id} className="flex items-center justify-between border border-white/15 p-3">
              <span className="font-body text-sm text-bone">{c.name}</span>
              <span className="font-body text-xs text-ash">{CAMPAIGN_STATUS_LABEL[c.status]}</span>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <CampaignForm clientId={clientId} serviceOptions={serviceOptions} onDone={handleCreated} />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={serviceOptions.length === 0}
          title={serviceOptions.length === 0 ? "This client has no approved services yet" : undefined}
          className="self-start rounded-none border border-white/15 bg-void px-3 py-2 font-body text-xs text-bone hover:border-white/30 disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          Create Campaign
        </button>
      )}
    </div>
  );
}

function CampaignForm({
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
  const [platform, setPlatform] = useState("");
  const [objective, setObjective] = useState("");
  const [status, setStatus] = useState<ClientCampaignStatus>("planning");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [spend, setSpend] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (name.trim().length === 0) {
      setError("Enter a campaign name.");
      return;
    }
    if (!serviceId) {
      setError("Select a service.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError("End date cannot be before the start date.");
      return;
    }
    const budgetNum = budget === "" ? undefined : Number(budget);
    const spendNum = spend === "" ? undefined : Number(spend);
    if (budgetNum !== undefined && (Number.isNaN(budgetNum) || budgetNum < 0)) {
      setError("Budget must be a non-negative number.");
      return;
    }
    if (spendNum !== undefined && (Number.isNaN(spendNum) || spendNum < 0)) {
      setError("Spend must be a non-negative number.");
      return;
    }

    const selectedOption = serviceOptions.find((s) => s.id === serviceId);
    if (!selectedOption) {
      setError("Select a service.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await saveCampaign({
      clientId,
      serviceEngagementId: selectedOption.engagementId,
      name: name.trim(),
      platform: platform.trim() || undefined,
      objective: objective.trim() || undefined,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budget: budgetNum,
      spend: spendNum,
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

      <Field label="Campaign name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <Field label="Platform">
          <input
            type="text"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="e.g. Meta, Google"
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
          />
        </Field>
      </div>

      <Field label="Objective">
        <input
          type="text"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="e.g. Lead Generation"
          className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone placeholder-ash focus-visible:-outline-offset-2"
        />
      </Field>

      <Field label="Status (client-visible)">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ClientCampaignStatus)}
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
        <Field label="End date">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Budget (₹)">
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </Field>
        <Field label="Spend (₹)">
          <input
            type="number"
            min={0}
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
            className="w-full rounded-none border border-white/15 bg-void px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="rounded-none bg-white px-4 py-2 font-body text-sm text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {submitting ? "Saving" : "Save Campaign"}
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
