"use client";

import { useState } from "react";
import TextField from "@/components/form/fields/TextField";
import TextAreaField from "@/components/form/fields/TextAreaField";
import TagsField from "@/components/form/fields/TagsField";
import { companySchema, type CompanyInput } from "@/shared/validation/onboarding";
import { issuesToFieldErrors } from "@/lib/form/zodErrors";
import { useFieldRegistry } from "@/lib/form/useFieldRegistry";
import ValidationSummary from "@/components/form/ValidationSummary";

type CompanyDetailsStepProps = {
  initialValue: Partial<CompanyInput> | null;
  onNext: (value: CompanyInput) => Promise<void>;
  onBack: () => void;
  saving: boolean;
  saveMessage: string | null;
};

type FormState = {
  name: string;
  industry: string;
  description: string;
  website: string;
  locations: string[];
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  whatsapp: string;
};

// Visual top-to-bottom order — drives both "first invalid field" navigation
// and the order items appear in the validation summary.
const FIELD_ORDER: (keyof FormState)[] = [
  "name",
  "industry",
  "description",
  "website",
  "locations",
  "contactPerson",
  "designation",
  "email",
  "phone",
  "whatsapp",
];

const FIELD_LABELS: Record<keyof FormState, string> = {
  name: "Company name",
  industry: "Industry",
  description: "Business description",
  website: "Website",
  locations: "Business locations",
  contactPerson: "Contact person",
  designation: "Designation",
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
};

function toFormState(value: Partial<CompanyInput> | null): FormState {
  return {
    name: value?.name ?? "",
    industry: value?.industry ?? "",
    description: value?.description ?? "",
    website: value?.website ?? "",
    locations: value?.locations ?? [],
    contactPerson: value?.contactPerson ?? "",
    designation: value?.designation ?? "",
    email: value?.email ?? "",
    phone: value?.phone ?? "",
    whatsapp: value?.whatsapp ?? "",
  };
}

export default function CompanyDetailsStep({
  initialValue,
  onNext,
  onBack,
  saving,
  saveMessage,
}: CompanyDetailsStepProps) {
  const [form, setForm] = useState<FormState>(toFormState(initialValue));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const { register, focusFirst } = useFieldRegistry();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Re-validates the whole form but only ever touches this one field's error
  // — keeps other fields' errors (shown or not-yet-shown) untouched so blur
  // never surfaces errors the user hasn't reached yet.
  const validateField = (key: keyof FormState) => {
    const parsed = companySchema.safeParse(form);
    const fieldErrors = parsed.success ? {} : issuesToFieldErrors(parsed.error.issues);
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldErrors[key]) next[key] = fieldErrors[key];
      else delete next[key];
      return next;
    });
  };

  const handleContinue = () => {
    const parsed = companySchema.safeParse(form);
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
        <h1 className="font-display text-xl text-bone md:text-2xl">Company details</h1>
        <p className="mt-1 font-body text-sm text-ash">
          Tell us about the business we&apos;ll be working with.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Company name"
          required
          value={form.name}
          onChange={(v) => set("name", v)}
          onBlur={() => validateField("name")}
          error={errors.name}
          fieldRef={register("name")}
          placeholder="e.g., ABC Foods Pvt. Ltd."
        />
        <TextField
          label="Industry"
          required
          value={form.industry}
          onChange={(v) => set("industry", v)}
          onBlur={() => validateField("industry")}
          error={errors.industry}
          fieldRef={register("industry")}
          placeholder="e.g., Retail, Healthcare, Education"
        />
      </div>

      <TextAreaField
        label="Business description"
        value={form.description}
        onChange={(v) => set("description", v)}
        onBlur={() => validateField("description")}
        error={errors.description}
        fieldRef={register("description")}
        placeholder="Briefly describe what your business does and what you offer"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Website"
          type="url"
          value={form.website}
          onChange={(v) => set("website", v)}
          onBlur={() => validateField("website")}
          error={errors.website}
          placeholder="e.g., https://www.yourcompany.com"
          fieldRef={register("website")}
        />
        <TagsField
          label="Business locations"
          value={form.locations}
          onChange={(v) => set("locations", v)}
          onBlur={() => validateField("locations")}
          placeholder="e.g., Kochi, Alappuzha — press Enter to add"
          error={errors.locations}
          fieldRef={register("locations")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Contact person"
          required
          value={form.contactPerson}
          onChange={(v) => set("contactPerson", v)}
          onBlur={() => validateField("contactPerson")}
          error={errors.contactPerson}
          fieldRef={register("contactPerson")}
          placeholder="e.g., Anand Suresh"
        />
        <TextField
          label="Designation"
          value={form.designation}
          onChange={(v) => set("designation", v)}
          onBlur={() => validateField("designation")}
          error={errors.designation}
          fieldRef={register("designation")}
          placeholder="e.g., Marketing Manager, Founder"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(v) => set("email", v)}
          onBlur={() => validateField("email")}
          error={errors.email}
          fieldRef={register("email")}
          placeholder="e.g., name@company.com"
        />
        <TextField
          label="Phone"
          type="tel"
          required
          value={form.phone}
          onChange={(v) => set("phone", v)}
          onBlur={() => validateField("phone")}
          error={errors.phone}
          fieldRef={register("phone")}
          placeholder="e.g., +91 98765 43210"
        />
      </div>

      <TextField
        label="WhatsApp"
        type="tel"
        value={form.whatsapp}
        onChange={(v) => set("whatsapp", v)}
        onBlur={() => validateField("whatsapp")}
        error={errors.whatsapp}
        fieldRef={register("whatsapp")}
        placeholder="Same as phone, or a different number"
      />

      {saveMessage && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {saveMessage}
        </p>
      )}

      <ValidationSummary
        key={attempt}
        items={summaryItems}
        onSelect={(key) => focusFirst([key])}
      />

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
