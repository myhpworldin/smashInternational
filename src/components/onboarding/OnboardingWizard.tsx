"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingDraftStore, type OnboardingDraft } from "@/store/useOnboardingDraftStore";
import {
  getApplicableSteps,
  stepCompleteness,
  firstIncompleteApplicableStep,
  type OnboardingStepId,
} from "@/shared/onboarding/completeness";
import type { CompanyInput, ObjectivesInput, TargetAudienceInput, BudgetInput } from "@/shared/validation/onboarding";
import { readLastStep, writeLastStep, clearSectionCache, clearAllDraftCache } from "@/lib/onboarding/draftCache";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import StepTransition from "@/components/onboarding/StepTransition";
import ServiceSelectionStep from "@/components/onboarding/ServiceSelectionStep";
import ServiceRequirementsStep from "@/components/onboarding/ServiceRequirementsStep";
import CompanyDetailsStep from "@/components/onboarding/CompanyDetailsStep";
import BusinessObjectivesStep from "@/components/onboarding/BusinessObjectivesStep";
import TargetAudienceStep from "@/components/onboarding/TargetAudienceStep";
import BudgetStep from "@/components/onboarding/BudgetStep";
import SummaryStep from "@/components/onboarding/SummaryStep";

const STEP_LABELS: Record<OnboardingStepId, string> = {
  services: "Services",
  requirements: "Requirements",
  company: "Company",
  objectives: "Objectives",
  audience: "Audience",
  budget: "Budget",
};

export default function OnboardingWizard({
  initialDraft,
  changesRequestedNotes,
  onboardingId,
  serverUpdatedAt,
}: {
  initialDraft: OnboardingDraft;
  changesRequestedNotes?: string | null;
  // Identifies this draft for the browser-side resilience cache (see
  // lib/onboarding/draftCache.ts) — the Mongo document id, never the
  // access-token/session credential, so it's safe to keep in ordinary
  // client state and localStorage.
  onboardingId: string;
  // The server document's own updatedAt (ISO string) at the moment this
  // page was rendered — used only to tell a genuinely unsynced local cache
  // entry apart from a stale one that predates data the server already has.
  serverUpdatedAt: string;
}) {
  const router = useRouter();
  const saveStatus = useOnboardingDraftStore((s) => s.saveStatus);
  const saveMessage = useOnboardingDraftStore((s) => s.saveMessage);
  const saveDraft = useOnboardingDraftStore((s) => s.saveDraft);

  // Sourced directly from the server-fetched prop, not the (module-global)
  // save-status store — see the comment in useOnboardingDraftStore.ts for
  // why that matters for the very first render.
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  // Resumes exactly where the user left off (a cached "last visited step"
  // hint, same-browser only) rather than always the first incomplete step —
  // covers revisiting an already-complete earlier step to tweak it, refresh
  // mid-edit, and land back there instead of being bounced forward. Falls
  // back to the existing completeness-derived entry point whenever the hint
  // is missing, stale (not one of the currently applicable steps — e.g. the
  // service selection changed since), or this is a first-ever visit.
  const [step, setStep] = useState<OnboardingStepId | "summary">(() => {
    const applicable = getApplicableSteps(initialDraft);
    const cached = readLastStep(onboardingId);
    if (cached && (applicable as string[]).includes(cached)) {
      return cached as OnboardingStepId;
    }
    if (cached === "summary") return "summary";
    return firstIncompleteApplicableStep(initialDraft);
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Flipped right before clearAllDraftCache on a confirmed submission —
  // guards the effect below from writing the step hint straight back after
  // it's been cleared (a render this same submission triggers, e.g. via
  // router.refresh(), can still run this effect once more before the tree
  // actually swaps over to OnboardingStatusScreen).
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current) return;
    writeLastStep(onboardingId, step);
  }, [onboardingId, step]);

  const applicableSteps = useMemo(() => getApplicableSteps(draft), [draft]);
  const completeness = useMemo(() => stepCompleteness(draft), [draft]);
  const progressSteps = applicableSteps.map((id) => ({
    id,
    label: STEP_LABELS[id],
    complete: completeness[id],
  }));

  const stepAfter = (current: OnboardingStepId): OnboardingStepId | "summary" => {
    const index = applicableSteps.indexOf(current);
    return applicableSteps[index + 1] ?? "summary";
  };

  const handleSave = async (patch: Partial<OnboardingDraft>, nextStep: OnboardingStepId | "summary") => {
    const result = await saveDraft(patch);
    if (!result.ok) {
      if (result.unauthorized) {
        router.push("/login");
      }
      return;
    }
    // The server now has this section — the local resilience cache entry
    // for it (if any) would otherwise linger as a harmless but pointless
    // stale copy until it aged past serverUpdatedAt on some later mount.
    for (const section of Object.keys(patch)) {
      clearSectionCache(onboardingId, section);
    }
    setDraft((prev) => ({ ...prev, ...patch }));
    setStep(nextStep);
  };

  const saving = saveStatus === "saving";

  // Guards against a double-click submitting twice: the button disables the
  // instant `submitting` flips true, before any network round trip starts.
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/onboarding/submit", { method: "POST" });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (response.ok && data?.ok) {
        // Only now — confirmed by the server, never optimistically before
        // this point — is the local resilience cache cleared. It must not
        // be cleared before a confirmed submission, since a failed/aborted
        // submit attempt should leave the draft (local and server) fully
        // intact and editable, exactly as if nothing had happened.
        submittedRef.current = true;
        clearAllDraftCache(onboardingId);
        // Re-navigates to this same server component with the now-submitted
        // status, which swaps in OnboardingStatusScreen — the single source
        // of truth for "what does submitted look like" stays in one place
        // rather than duplicating that screen here for the optimistic case.
        // The ?submitted=1 marker (Stage 1 Phase 2) tells that screen this
        // is the instant right after a real submission, so it's the one
        // case that runs the dashboard countdown — a plain later revisit to
        // /onboarding never carries this param, so it never re-fires.
        router.replace("/onboarding?submitted=1");
        return;
      }

      // A retried request after a timeout can land here even though the
      // first attempt actually succeeded — the record's status has already
      // moved past draft/changes_requested, so check the current status
      // before showing a scary error for what is, in fact, a success.
      const current = await fetch("/api/onboarding")
        .then((r) => r.json())
        .catch(() => null);

      if (current?.ok && current.onboarding.status !== "draft" && current.onboarding.status !== "changes_requested") {
        submittedRef.current = true;
        clearAllDraftCache(onboardingId);
        router.replace("/onboarding?submitted=1");
        return;
      }

      setSubmitError(data?.errors?.join(" ") ?? data?.message ?? "Couldn't submit. Try again.");
    } catch {
      setSubmitError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10 md:px-0">
      {changesRequestedNotes && (
        <div className="border border-smash-dim p-4">
          <p className="font-body text-xs tracking-[0.14em] text-smash-text uppercase">Changes requested</p>
          <p className="mt-1 font-body text-sm text-bone">{changesRequestedNotes}</p>
        </div>
      )}

      <OnboardingProgress
        steps={progressSteps}
        currentStepId={step === "summary" ? applicableSteps[applicableSteps.length - 1] : step}
      />

      <StepTransition key={step}>
        {step === "services" && (
          <ServiceSelectionStep
            initialValue={draft.selectedServiceIds}
            saving={saving}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            onboardingId={onboardingId}
            serverUpdatedAt={serverUpdatedAt}
            onNext={(value) => handleSave({ selectedServiceIds: value }, "requirements")}
          />
        )}

        {step === "requirements" && (
          <ServiceRequirementsStep
            selectedServiceIds={draft.selectedServiceIds}
            initialServiceResponses={draft.serviceResponses}
            initialBrandProfile={draft.brandProfile}
            saving={saving}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            onboardingId={onboardingId}
            serverUpdatedAt={serverUpdatedAt}
            onBack={() => setStep("services")}
            onEditServices={() => setStep("services")}
            onNext={(value) => handleSave(value, stepAfter("requirements"))}
          />
        )}

        {step === "company" && (
          <CompanyDetailsStep
            initialValue={draft.company as Partial<CompanyInput> | null}
            saving={saving}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            onboardingId={onboardingId}
            serverUpdatedAt={serverUpdatedAt}
            onBack={() => setStep("requirements")}
            onNext={(value) => handleSave({ company: value }, stepAfter("company"))}
          />
        )}

        {step === "objectives" && (
          <BusinessObjectivesStep
            initialValue={draft.objectives as Partial<ObjectivesInput> | null}
            saving={saving}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            onboardingId={onboardingId}
            serverUpdatedAt={serverUpdatedAt}
            onBack={() => setStep("company")}
            onNext={(value) => handleSave({ objectives: value }, stepAfter("objectives"))}
          />
        )}

        {step === "audience" && (
          <TargetAudienceStep
            initialValue={draft.targetAudience as Partial<TargetAudienceInput> | null}
            saving={saving}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            onboardingId={onboardingId}
            serverUpdatedAt={serverUpdatedAt}
            onBack={() => setStep("objectives")}
            onNext={(value) => handleSave({ targetAudience: value }, stepAfter("audience"))}
          />
        )}

        {step === "budget" && (
          <BudgetStep
            selectedServiceIds={draft.selectedServiceIds}
            initialValue={draft.budget as Partial<BudgetInput> | null}
            saving={saving}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            onboardingId={onboardingId}
            serverUpdatedAt={serverUpdatedAt}
            onBack={() => setStep("audience")}
            onNext={(value) => handleSave({ budget: value }, "summary")}
          />
        )}

        {step === "summary" && (
          <SummaryStep
            draft={draft}
            onEditStep={(target) => setStep(target)}
            onBack={() => setStep(applicableSteps[applicableSteps.length - 1])}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )}
      </StepTransition>
    </div>
  );
}
