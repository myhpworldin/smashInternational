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
import SaveStatusIndicator from "@/components/form/SaveStatusIndicator";
import type { SaveStatus } from "@/store/useOnboardingDraftStore";
import { readSectionCacheIfNewer } from "@/lib/onboarding/draftCache";
import { useDraftCacheSync } from "@/lib/onboarding/useDraftCacheSync";
import { useOpportunisticAutosave } from "@/lib/onboarding/useOpportunisticAutosave";

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
  saveStatus: SaveStatus;
  saveMessage: string | null;
  onboardingId: string;
  serverUpdatedAt: string;
};

type AudienceFormState = {
  ageGroups: string[];
  gender: string[];
  locations: string[];
  customerType: string[];
  interests: string[];
  existingCustomerProfile: string;
};

// "All" means "every gender" (or every age group) — it can never be
// combined with a specific selection. Applied wherever gender/ageGroups
// enters local state (initial load, cache restore) so a value saved
// before this rule existed self-heals instead of surfacing an impossible
// combination.
function normalizeAll(values: string[]): string[] {
  if (values.includes("all") && values.length > 1) return ["all"];
  return values;
}

const cachedOrInitial = (
  onboardingId: string,
  serverUpdatedAt: string,
  initialValue: Partial<TargetAudienceInput> | null,
): AudienceFormState => {
  const cached = readSectionCacheIfNewer<AudienceFormState>(onboardingId, "targetAudience", serverUpdatedAt);
  if (cached) {
    return { ...cached, ageGroups: normalizeAll(cached.ageGroups), gender: normalizeAll(cached.gender) };
  }
  return {
    ageGroups: normalizeAll(initialValue?.ageGroups ?? []),
    gender: normalizeAll(initialValue?.gender ?? []),
    locations: initialValue?.locations ?? [],
    customerType: initialValue?.customerType ? [initialValue.customerType] : [],
    interests: initialValue?.interests ?? [],
    existingCustomerProfile: initialValue?.existingCustomerProfile ?? "",
  };
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
  saveStatus,
  saveMessage,
  onboardingId,
  serverUpdatedAt,
}: TargetAudienceStepProps) {
  const [initial] = useState(() => cachedOrInitial(onboardingId, serverUpdatedAt, initialValue));
  const [ageGroups, setAgeGroups] = useState<string[]>(initial.ageGroups);
  const [gender, setGender] = useState<string[]>(initial.gender);
  const [locations, setLocations] = useState<string[]>(initial.locations);
  const [customerType, setCustomerType] = useState<string[]>(initial.customerType);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [existingCustomerProfile, setExistingCustomerProfile] = useState(initial.existingCustomerProfile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const { register, focusFirst } = useFieldRegistry();

  // Enforces "All" as exclusive of every other option in a chip group:
  // - selecting "All" while something else is already checked clears those
  // - selecting a specific option while "All" is checked drops "All"
  // ChipGroupField still owns the actual toggle (add/remove one value) —
  // this only resolves the conflict in whatever it hands back.
  const resolveAllExclusivity = (current: string[], next: string[]): string[] => {
    const allJustToggled = next.includes("all") !== current.includes("all");
    if (allJustToggled && next.includes("all")) return ["all"];
    if (!allJustToggled && next.includes("all") && next.length > 1) {
      return next.filter((v) => v !== "all");
    }
    return next;
  };

  const handleAgeGroupsChange = (next: string[]) => setAgeGroups(resolveAllExclusivity(ageGroups, next));
  const handleGenderChange = (next: string[]) => setGender(resolveAllExclusivity(gender, next));

  const buildValue = () => ({
    ageGroups,
    gender,
    locations,
    customerType: customerType[0],
    interests,
    existingCustomerProfile,
  });

  useDraftCacheSync(onboardingId, "targetAudience", {
    ageGroups,
    gender,
    locations,
    customerType,
    interests,
    existingCustomerProfile,
  });
  const validForAutosave = targetAudienceSchema.safeParse(buildValue());
  useOpportunisticAutosave(
    onboardingId,
    validForAutosave.success ? { targetAudience: validForAutosave.data } : null,
  );

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
        description="Select All if this applies to every age group, or pick specific ones."
        multiple
        options={AGE_GROUP_OPTIONS}
        value={ageGroups}
        onChange={handleAgeGroupsChange}
        error={errors.ageGroups}
        fieldRef={register("ageGroups")}
      />

      <ChipGroupField
        label="Gender"
        description="Select All if this applies to every gender, or pick specific ones."
        multiple
        options={GENDER_OPTIONS}
        value={gender}
        onChange={handleGenderChange}
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
