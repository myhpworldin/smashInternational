"use client";

import { useState } from "react";
import ChipGroupField from "@/components/form/fields/ChipGroupField";
import TagsField from "@/components/form/fields/TagsField";
import TextAreaField from "@/components/form/fields/TextAreaField";
import { targetAudienceSchema, type TargetAudienceInput } from "@/shared/validation/onboarding";
import { AGE_GROUPS } from "@/shared/types/onboarding";
import { issuesToFieldErrors } from "@/lib/form/zodErrors";
import { useFieldRegistry } from "@/lib/form/useFieldRegistry";
import ValidationSummary from "@/components/form/ValidationSummary";

const FIELD_ORDER = [
  "ageGroups",
  "gender",
  "locations",
  "customerType",
  "interests",
  "existingCustomerProfile",
] as const;
const FIELD_LABELS: Record<(typeof FIELD_ORDER)[number], string> = {
  ageGroups: "Age group",
  gender: "Gender",
  locations: "Location",
  customerType: "Customer type",
  interests: "Interests",
  existingCustomerProfile: "Existing customer profile",
};

type TargetAudienceStepProps = {
  initialValue: Partial<TargetAudienceInput> | null;
  onNext: (value: TargetAudienceInput) => Promise<void>;
  onBack: () => void;
  saving: boolean;
  saveMessage: string | null;
};

const AGE_GROUP_OPTIONS = AGE_GROUPS.map((g) => ({ value: g.id, label: g.label }));
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "all", label: "All" },
];
const CUSTOMER_TYPE_OPTIONS = [
  { value: "b2b", label: "B2B" },
  { value: "b2c", label: "B2C" },
  { value: "both", label: "Both" },
];

export default function TargetAudienceStep({
  initialValue,
  onNext,
  onBack,
  saving,
  saveMessage,
}: TargetAudienceStepProps) {
  const [ageGroups, setAgeGroups] = useState<string[]>(initialValue?.ageGroups ?? []);
  const [gender, setGender] = useState<string[]>(initialValue?.gender ?? []);
  const [locations, setLocations] = useState<string[]>(initialValue?.locations ?? []);
  const [customerType, setCustomerType] = useState<string[]>(
    initialValue?.customerType ? [initialValue.customerType] : [],
  );
  const [interests, setInterests] = useState<string[]>(initialValue?.interests ?? []);
  const [existingCustomerProfile, setExistingCustomerProfile] = useState(
    initialValue?.existingCustomerProfile ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const { register, focusFirst } = useFieldRegistry();

  const buildValue = () => ({
    ageGroups,
    gender,
    locations,
    customerType: customerType[0],
    interests,
    existingCustomerProfile,
  });

  const validateField = (key: (typeof FIELD_ORDER)[number]) => {
    const parsed = targetAudienceSchema.safeParse(buildValue());
    const fieldErrors = parsed.success ? {} : issuesToFieldErrors(parsed.error.issues);
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldErrors[key]) next[key] = fieldErrors[key];
      else delete next[key];
      return next;
    });
  };

  const handleContinue = () => {
    const parsed = targetAudienceSchema.safeParse(buildValue());
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
        <h1 className="font-display text-xl text-bone md:text-2xl">Target audience</h1>
        <p className="mt-1 font-body text-sm text-ash">
          Help us understand who this business is trying to reach.
        </p>
      </div>

      <ChipGroupField
        label="Age group"
        multiple
        options={AGE_GROUP_OPTIONS}
        value={ageGroups}
        onChange={setAgeGroups}
        error={errors.ageGroups}
        fieldRef={register("ageGroups")}
      />

      <ChipGroupField
        label="Gender"
        multiple
        options={GENDER_OPTIONS}
        value={gender}
        onChange={setGender}
        error={errors.gender}
        fieldRef={register("gender")}
      />

      <TagsField
        label="Location"
        value={locations}
        onChange={setLocations}
        onBlur={() => validateField("locations")}
        placeholder="e.g., Kochi, Kerala — press Enter to add"
        error={errors.locations}
        fieldRef={register("locations")}
      />

      <ChipGroupField
        label="Customer type"
        required
        multiple={false}
        options={CUSTOMER_TYPE_OPTIONS}
        value={customerType}
        onChange={setCustomerType}
        error={errors.customerType}
        fieldRef={register("customerType")}
      />

      <TagsField
        label="Interests"
        value={interests}
        onChange={setInterests}
        onBlur={() => validateField("interests")}
        placeholder="e.g., Fitness, Home décor — press Enter to add"
        error={errors.interests}
        fieldRef={register("interests")}
      />

      <TextAreaField
        label="Existing customer profile"
        description="Describe your typical customer today, if you already have one."
        value={existingCustomerProfile}
        onChange={setExistingCustomerProfile}
        onBlur={() => validateField("existingCustomerProfile")}
        error={errors.existingCustomerProfile}
        fieldRef={register("existingCustomerProfile")}
        placeholder="e.g., Working professionals aged 25–40 in Tier 1 cities"
      />

      {saveMessage && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {saveMessage}
        </p>
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
