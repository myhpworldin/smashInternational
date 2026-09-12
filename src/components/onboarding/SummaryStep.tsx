"use client";

import { useEffect, useState } from "react";
import type { OnboardingDraft } from "@/store/useOnboardingDraftStore";
import {
  getApplicableSteps,
  stepCompleteness,
  type OnboardingStepId,
} from "@/shared/onboarding/completeness";
import { getServiceById } from "@/shared/config/services";
import { BUSINESS_OBJECTIVES, ASSET_TYPES, type AssetType } from "@/shared/types/onboarding";
import { formatINR } from "@/lib/format/currency";
import type { CompanyInput, ObjectivesInput, TargetAudienceInput, BudgetInput } from "@/shared/validation/onboarding";

const STEP_LABELS: Record<OnboardingStepId, string> = {
  services: "Services",
  requirements: "Requirements",
  company: "Company",
  objectives: "Objectives",
  audience: "Audience",
  budget: "Budget",
};

type Asset = { _id: string; assetType: AssetType; originalFilename: string };

export default function SummaryStep({
  draft,
  onEditStep,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  draft: OnboardingDraft;
  onEditStep: (step: OnboardingStepId) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    fetch("/api/onboarding/assets")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) setAssets(data.assets);
      })
      .catch(() => null);
  }, []);

  const company = draft.company as Partial<CompanyInput> | null;
  const objectives = draft.objectives as Partial<ObjectivesInput> | null;
  const targetAudience = draft.targetAudience as Partial<TargetAudienceInput> | null;
  const budget = draft.budget as Partial<BudgetInput> | null;

  const applicableSteps = getApplicableSteps(draft);
  const completeness = stepCompleteness(draft);
  const missingSteps = applicableSteps.filter((id) => !completeness[id]);

  const services = draft.selectedServiceIds.map((id) => getServiceById(id)).filter((s) => s !== undefined);
  const responsesByService = new Map(draft.serviceResponses.map((r) => [r.serviceId, r.responses]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl text-bone md:text-2xl">Review</h1>
        <p className="mt-1 font-body text-sm text-ash">
          Check everything before it goes to SMASH. You can edit any section below.
        </p>
      </div>

      {missingSteps.length > 0 && (
        <div className="flex flex-col gap-2 border border-smash-dim p-4">
          <p className="font-body text-sm text-smash-text">Some required information is still missing:</p>
          <ul className="flex flex-col gap-1">
            {missingSteps.map((id) => (
              <li key={id} className="flex items-center justify-between font-body text-sm text-bone">
                {STEP_LABELS[id]}
                <button
                  type="button"
                  onClick={() => onEditStep(id)}
                  className="text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SummaryRow label="Company" value={company?.name} onEdit={() => onEditStep("company")} />
      <SummaryRow
        label="Services"
        value={`${draft.selectedServiceIds.length} selected`}
        onEdit={() => onEditStep("services")}
      >
        <ul className="mt-1 flex flex-col gap-0.5 font-body text-xs text-ash">
          {services.map((s) => (
            <li key={s!.id}>{s!.label}</li>
          ))}
        </ul>
      </SummaryRow>
      <SummaryRow
        label="Objectives"
        value={objectives?.selected?.map((o) => BUSINESS_OBJECTIVES.find((b) => b.id === o)?.label ?? o).join(", ")}
        onEdit={() => onEditStep("objectives")}
      />
      <SummaryRow
        label="Target location"
        value={targetAudience?.locations?.join(", ") || undefined}
        onEdit={() => onEditStep("audience")}
      />

      {applicableSteps.includes("budget") && (
        <SummaryRow
          label="Monthly budget"
          value={budget?.monthlyTotal !== undefined ? formatINR(budget.monthlyTotal) : undefined}
          onEdit={() => onEditStep("budget")}
        >
          {budget?.allocations && budget.allocations.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5 font-body text-xs text-ash">
              {budget.allocations.map((a) => (
                <li key={a.channel}>
                  {a.channel}: {formatINR(a.amount)}
                </li>
              ))}
            </ul>
          )}
        </SummaryRow>
      )}

      <div className="flex flex-col gap-2 border-t border-carbon pt-4">
        <div className="flex items-center justify-between">
          <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">Service requirements</p>
          <button
            type="button"
            onClick={() => onEditStep("requirements")}
            className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
          >
            Edit
          </button>
        </div>
        {services.map((service) => {
          const responses = responsesByService.get(service!.id) ?? {};
          const filled = service!.fields.filter((f) => {
            const v = responses[f.key];
            return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
          });
          return (
            <div key={service!.id} className="font-body text-xs text-ash">
              <span className="text-bone">{service!.label}:</span>{" "}
              {filled.length > 0
                ? filled.map((f) => `${f.label}: ${formatFieldValue(responses[f.key])}`).join(" · ")
                : "No details entered"}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-carbon pt-4">
        <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">Assets</p>
        {assets.length === 0 ? (
          <p className="font-body text-xs text-ash">No files uploaded.</p>
        ) : (
          <ul className="flex flex-col gap-0.5 font-body text-xs text-ash">
            {assets.map((a) => (
              <li key={a._id}>
                {a.originalFilename} ({ASSET_TYPES.find((t) => t.id === a.assetType)?.label})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-carbon pt-4">
        {missingSteps.length > 0 && (
          <p className="font-body text-xs text-ash">
            Complete the sections above before submitting.
          </p>
        )}
        {submitError && (
          <p role="alert" className="font-body text-xs text-smash-text">
            {submitError}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="font-body text-sm text-ash hover:text-bone focus-visible:-outline-offset-2"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={missingSteps.length > 0 || submitting}
            aria-busy={submitting}
            className="rounded-none bg-smash px-[18px] py-[14px] font-body text-white disabled:opacity-60 focus-visible:-outline-offset-2"
          >
            {submitting ? "Submitting" : "Submit to SMASH"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatFieldValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function SummaryRow({
  label,
  value,
  onEdit,
  children,
}: {
  label: string;
  value?: string;
  onEdit: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-carbon pb-3">
      <div className="flex items-center justify-between">
        <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">{label}</p>
        <button
          type="button"
          onClick={onEdit}
          className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
        >
          Edit
        </button>
      </div>
      <p className="font-body text-sm text-bone">{value || "Not provided"}</p>
      {children}
    </div>
  );
}
