"use client";

import { useState } from "react";
import TextField from "@/components/form/fields/TextField";
import TextAreaField from "@/components/form/fields/TextAreaField";
import TagsField from "@/components/form/fields/TagsField";
import { companySchema, type CompanyInput } from "@/shared/validation/onboarding";
import { issuesToFieldErrors } from "@/lib/form/zodErrors";

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

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleContinue = () => {
    const parsed = companySchema.safeParse(form);
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
        <h1 className="font-display text-xl text-bone md:text-2xl">Company details</h1>
        <p className="mt-1 font-body text-sm text-ash">
          Tell us about the business we&apos;ll be working with.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Company name" required value={form.name} onChange={(v) => set("name", v)} error={errors.name} />
        <TextField label="Industry" required value={form.industry} onChange={(v) => set("industry", v)} error={errors.industry} />
      </div>

      <TextAreaField
        label="Business description"
        value={form.description}
        onChange={(v) => set("description", v)}
        error={errors.description}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Website" type="url" value={form.website} onChange={(v) => set("website", v)} error={errors.website} placeholder="https://" />
        <TagsField
          label="Business locations"
          value={form.locations}
          onChange={(v) => set("locations", v)}
          placeholder="Type a city and press Enter"
          error={errors.locations}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Contact person" required value={form.contactPerson} onChange={(v) => set("contactPerson", v)} error={errors.contactPerson} />
        <TextField label="Designation" value={form.designation} onChange={(v) => set("designation", v)} error={errors.designation} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Email" type="email" required value={form.email} onChange={(v) => set("email", v)} error={errors.email} />
        <TextField label="Phone" type="tel" required value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} />
      </div>

      <TextField label="WhatsApp" type="tel" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} error={errors.whatsapp} />

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
