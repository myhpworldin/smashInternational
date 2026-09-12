import TextAreaField from "@/components/form/fields/TextAreaField";
import TextField from "@/components/form/fields/TextField";
import type { BrandProfileInput } from "@/shared/validation/onboarding";

type BrandProfileValue = Partial<BrandProfileInput>;

type BrandProfileSectionProps = {
  value: BrandProfileValue;
  onChange: (value: BrandProfileValue) => void;
  errors: Record<string, string>;
};

// Shown once, shared by every selected service that needs brand context
// (see requiresBrandProfile in shared/config/services.ts) — never repeated
// per service.
export default function BrandProfileSection({ value, onChange, errors }: BrandProfileSectionProps) {
  const set = <K extends keyof BrandProfileValue>(key: K, v: BrandProfileValue[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="flex flex-col gap-4 border border-carbon p-4">
      <h3 className="font-body text-xs tracking-[0.14em] text-ash uppercase">Brand profile</h3>
      <p className="font-body text-xs text-ash">
        Used across every creative and social service you&apos;ve selected — you only need to fill
        this in once.
      </p>
      <TextAreaField
        label="Brand story"
        required
        value={value.brandStory ?? ""}
        onChange={(v) => set("brandStory", v)}
        error={errors.brandStory}
      />
      <TextAreaField
        label="Brand positioning"
        value={value.brandPositioning ?? ""}
        onChange={(v) => set("brandPositioning", v)}
        error={errors.brandPositioning}
      />
      <TextField
        label="Tone of voice"
        value={value.toneOfVoice ?? ""}
        onChange={(v) => set("toneOfVoice", v)}
        error={errors.toneOfVoice}
      />
      <TextAreaField
        label="Key products / services"
        value={value.keyProductsServices ?? ""}
        onChange={(v) => set("keyProductsServices", v)}
        error={errors.keyProductsServices}
      />
      <TextAreaField
        label="USPs"
        value={value.usps ?? ""}
        onChange={(v) => set("usps", v)}
        error={errors.usps}
      />
      <TextAreaField
        label="Competitors"
        value={value.competitors ?? ""}
        onChange={(v) => set("competitors", v)}
        error={errors.competitors}
      />
    </div>
  );
}
