import TextAreaField from "@/components/form/fields/TextAreaField";
import TextField from "@/components/form/fields/TextField";
import type { BrandProfileInput } from "@/shared/validation/onboarding";

type BrandProfileValue = Partial<BrandProfileInput>;

type BrandProfileSectionProps = {
  value: BrandProfileValue;
  onChange: (value: BrandProfileValue) => void;
  errors: Record<string, string>;
  onBlurField?: (key: string) => void;
  registerField?: (key: string) => (el: HTMLDivElement | null) => void;
};

// Shown once, shared by every selected service that needs brand context
// (see requiresBrandProfile in shared/config/services.ts) — never repeated
// per service.
export default function BrandProfileSection({
  value,
  onChange,
  errors,
  onBlurField,
  registerField,
}: BrandProfileSectionProps) {
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
        onBlur={onBlurField ? () => onBlurField("brandStory") : undefined}
        error={errors.brandStory}
        fieldRef={registerField?.("brandStory")}
        placeholder="Tell us how your brand started and what it stands for"
      />
      <TextAreaField
        label="Brand positioning"
        value={value.brandPositioning ?? ""}
        onChange={(v) => set("brandPositioning", v)}
        onBlur={onBlurField ? () => onBlurField("brandPositioning") : undefined}
        error={errors.brandPositioning}
        fieldRef={registerField?.("brandPositioning")}
        placeholder="Describe how you want customers to see your brand"
      />
      <TextField
        label="Tone of voice"
        value={value.toneOfVoice ?? ""}
        onChange={(v) => set("toneOfVoice", v)}
        onBlur={onBlurField ? () => onBlurField("toneOfVoice") : undefined}
        error={errors.toneOfVoice}
        fieldRef={registerField?.("toneOfVoice")}
        placeholder="e.g., Friendly, professional, or playful"
      />
      <TextAreaField
        label="Key products / services"
        value={value.keyProductsServices ?? ""}
        onChange={(v) => set("keyProductsServices", v)}
        onBlur={onBlurField ? () => onBlurField("keyProductsServices") : undefined}
        error={errors.keyProductsServices}
        fieldRef={registerField?.("keyProductsServices")}
        placeholder="e.g., Organic skincare products, home delivery service"
      />
      <TextAreaField
        label="USPs"
        value={value.usps ?? ""}
        onChange={(v) => set("usps", v)}
        onBlur={onBlurField ? () => onBlurField("usps") : undefined}
        error={errors.usps}
        fieldRef={registerField?.("usps")}
        placeholder="e.g., Free delivery, 20+ years of experience, or same-day service"
      />
      <TextAreaField
        label="Competitors"
        value={value.competitors ?? ""}
        onChange={(v) => set("competitors", v)}
        onBlur={onBlurField ? () => onBlurField("competitors") : undefined}
        error={errors.competitors}
        fieldRef={registerField?.("competitors")}
        placeholder="List businesses you consider your main competitors"
      />
    </div>
  );
}
