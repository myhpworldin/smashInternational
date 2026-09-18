"use client";

import { useState } from "react";
import ChipGroupField from "@/components/form/fields/ChipGroupField";
import TextField from "@/components/form/fields/TextField";
import { objectivesSchema, type ObjectivesInput } from "@/shared/validation/onboarding";
import { BUSINESS_OBJECTIVES } from "@/shared/types/onboarding";
import { issuesToFieldErrors } from "@/lib/form/zodErrors";
import { useFieldRegistry } from "@/lib/form/useFieldRegistry";
import ValidationSummary from "@/components/form/ValidationSummary";
import SaveStatusIndicator from "@/components/form/SaveStatusIndicator";
import type { SaveStatus } from "@/store/useOnboardingDraftStore";
import { readSectionCacheIfNewer } from "@/lib/onboarding/draftCache";
import { useDraftCacheSync } from "@/lib/onboarding/useDraftCacheSync";
import { useOpportunisticAutosave } from "@/lib/onboarding/useOpportunisticAutosave";

const FIELD_ORDER = ["selected", "otherDetail"] as const;
const FIELD_LABELS: Record<(typeof FIELD_ORDER)[number], string> = {
  selected: "Objectives",
  otherDetail: "Tell us more",
};

type ObjectivesFormState = { selected: string[]; otherDetail: string };

type BusinessObjectivesStepProps = {
  initialValue: Partial<ObjectivesInput> | null;
  onNext: (value: ObjectivesInput) => Promise<void>;
  onBack: () => void;
  saving: boolean;
  saveStatus: SaveStatus;
  saveMessage: string | null;
  onboardingId: string;
  serverUpdatedAt: string;
};

const OPTIONS = BUSINESS_OBJECTIVES.map((o) => ({ value: o.id, label: o.label }));

const cachedOrInitial = (
  onboardingId: string,
  serverUpdatedAt: string,
  initialValue: Partial<ObjectivesInput> | null,
): ObjectivesFormState => {
  const cached = readSectionCacheIfNewer<ObjectivesFormState>(onboardingId, "objectives", serverUpdatedAt);
  return cached ?? { selected: initialValue?.selected ?? [], otherDetail: initialValue?.otherDetail ?? "" };
};

export default function BusinessObjectivesStep({
  initialValue,
  onNext,
  onBack,
  saving,
  saveStatus,
  saveMessage,
  onboardingId,
  serverUpdatedAt,
}: BusinessObjectivesStepProps) {
  const [initial] = useState(() => cachedOrInitial(onboardingId, serverUpdatedAt, initialValue));
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [otherDetail, setOtherDetail] = useState(initial.otherDetail);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const { register, focusFirst } = useFieldRegistry();

  useDraftCacheSync(onboardingId, "objectives", { selected, otherDetail });
  const validForAutosave = objectivesSchema.safeParse({ selected, otherDetail });
  useOpportunisticAutosave(onboardingId, validForAutosave.success ? { objectives: validForAutosave.data } : null);

  const validateField = (key: (typeof FIELD_ORDER)[number]) => {
    const parsed = objectivesSchema.safeParse({ selected, otherDetail });
    const fieldErrors = parsed.success ? {} : issuesToFieldErrors(parsed.error.issues);
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldErrors[key]) next[key] = fieldErrors[key];
      else delete next[key];
      return next;
    });
  };

  const handleContinue = () => {
    const parsed = objectivesSchema.safeParse({ selected, otherDetail });
    if (!parsed.success) {
      const fieldErrors = issuesToFieldErrors(parsed.error.issues);
      setErrors(fieldErrors);
      setAttempt((a) => a + 1);
      focusFirst(FIELD_ORDER.filter((key) => fieldErrors[key]));
      return;
    }
    setErrors({});
    if (saving) return;
    void onNext(parsed.data);
  };

  const summaryItems = FIELD_ORDER.filter((key) => errors[key]).map((key) => ({
    key,
    label: FIELD_LABELS[key],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl text-bone md:text-2xl">Business objectives</h1>
        <p className="mt-1 font-body text-sm text-ash">
          What should this engagement achieve? Select all that apply.
        </p>
      </div>

      <ChipGroupField
        label="Objectives"
        required
        multiple
        options={OPTIONS}
        value={selected}
        onChange={(v) => setSelected(v)}
        error={errors.selected}
        fieldRef={register("selected")}
      />

      {selected.includes("other") && (
        <TextField
          label="Tell us more"
          required
          value={otherDetail}
          onChange={setOtherDetail}
          onBlur={() => validateField("otherDetail")}
          error={errors.otherDetail}
          fieldRef={register("otherDetail")}
          placeholder="e.g., Investor relations, community engagement"
        />
      )}

      {saveMessage ? (
        <p role="alert" className="font-body text-xs text-smash-text">
          {saveMessage}
        </p>
      ) : (
        <SaveStatusIndicator status={saveStatus} />
      )}

      <ValidationSummary key={attempt} items={summaryItems} onSelect={(key) => focusFirst([key])} />

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
          onClick={handleContinue}
          disabled={saving}
          aria-busy={saving}
          className="rounded-none bg-white px-[18px] py-[14px] font-body text-void disabled:opacity-60 focus-visible:-outline-offset-2"
        >
          {saving ? "Saving" : "Continue"}
        </button>
      </div>
    </div>
  );
}
