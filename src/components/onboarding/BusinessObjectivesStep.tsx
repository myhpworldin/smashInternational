"use client";

import { useState } from "react";
import ChipGroupField from "@/components/form/fields/ChipGroupField";
import TextField from "@/components/form/fields/TextField";
import { objectivesSchema, type ObjectivesInput } from "@/shared/validation/onboarding";
import { BUSINESS_OBJECTIVES } from "@/shared/types/onboarding";
import { issuesToFieldErrors } from "@/lib/form/zodErrors";

type BusinessObjectivesStepProps = {
  initialValue: Partial<ObjectivesInput> | null;
  onNext: (value: ObjectivesInput) => Promise<void>;
  onBack: () => void;
  saving: boolean;
  saveMessage: string | null;
};

const OPTIONS = BUSINESS_OBJECTIVES.map((o) => ({ value: o.id, label: o.label }));

export default function BusinessObjectivesStep({
  initialValue,
  onNext,
  onBack,
  saving,
  saveMessage,
}: BusinessObjectivesStepProps) {
  const [selected, setSelected] = useState<string[]>(initialValue?.selected ?? []);
  const [otherDetail, setOtherDetail] = useState(initialValue?.otherDetail ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleContinue = () => {
    const parsed = objectivesSchema.safeParse({ selected, otherDetail });
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    if (saving) return;
    void onNext(parsed.data);
  };

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
      />

      {selected.includes("other") && (
        <TextField
          label="Tell us more"
          required
          value={otherDetail}
          onChange={setOtherDetail}
          error={errors.otherDetail}
        />
      )}

      {saveMessage && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {saveMessage}
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
