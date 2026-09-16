import type { ServiceFieldDef } from "@/shared/config/services";
import TextField from "@/components/form/fields/TextField";
import TextAreaField from "@/components/form/fields/TextAreaField";
import ChipGroupField from "@/components/form/fields/ChipGroupField";
import TagsField from "@/components/form/fields/TagsField";
import ServiceGroupListField from "@/components/onboarding/ServiceGroupListField";

type ServiceFieldRendererProps = {
  field: ServiceFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  onBlur?: () => void;
  // Registers this field's container for scroll/focus navigation — see
  // useFieldRegistry. Forwarded to the outer wrapper for every field type.
  fieldRef?: (el: HTMLDivElement | null) => void;
  // Only used for "groupList" fields — routes an error to the exact entry
  // and sub-field it belongs to instead of the list as a whole.
  errorFor?: (entryIndex: number, subKey: string) => string | undefined;
  // Only used for "groupList" fields — registers/blurs an entry's sub-field.
  registerEntry?: (entryIndex: number, subKey: string) => (el: HTMLDivElement | null) => void;
  onBlurEntry?: (entryIndex: number, subKey: string) => void;
};

const YES_NO_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

// The one place that turns a catalog field definition into an actual
// control — every service in shared/config/services.ts renders through
// this, so adding a new service never means writing new form UI.
export default function ServiceFieldRenderer({
  field,
  value,
  onChange,
  error,
  onBlur,
  fieldRef,
  errorFor,
  registerEntry,
  onBlurEntry,
}: ServiceFieldRendererProps) {
  switch (field.type) {
    case "text":
    case "url":
      return (
        <TextField
          label={field.label}
          required={field.required}
          type={field.type}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          onBlur={onBlur}
          error={error}
          fieldRef={fieldRef}
          placeholder={field.placeholder}
        />
      );

    case "textarea":
      return (
        <TextAreaField
          label={field.label}
          required={field.required}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          onBlur={onBlur}
          error={error}
          fieldRef={fieldRef}
          placeholder={field.placeholder}
        />
      );

    case "number":
      return (
        <TextField
          label={field.label}
          required={field.required}
          type="number"
          value={typeof value === "number" ? String(value) : ""}
          onChange={(raw) => onChange(raw === "" ? undefined : Number(raw))}
          onBlur={onBlur}
          error={error}
          fieldRef={fieldRef}
          placeholder={field.placeholder}
        />
      );

    case "boolean":
      return (
        <ChipGroupField
          label={field.label}
          required={field.required}
          multiple={false}
          options={YES_NO_OPTIONS}
          value={value === true ? ["true"] : value === false ? ["false"] : []}
          onChange={(v) => onChange(v.length === 0 ? undefined : v[0] === "true")}
          error={error}
          fieldRef={fieldRef}
        />
      );

    case "select":
      return (
        <ChipGroupField
          label={field.label}
          required={field.required}
          multiple={false}
          options={field.options ?? []}
          value={typeof value === "string" ? [value] : []}
          onChange={(v) => onChange(v[0])}
          error={error}
          fieldRef={fieldRef}
        />
      );

    case "multiselect":
      return (
        <ChipGroupField
          label={field.label}
          required={field.required}
          multiple
          options={field.options ?? []}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          error={error}
          fieldRef={fieldRef}
        />
      );

    case "tags":
      return (
        <TagsField
          label={field.label}
          required={field.required}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          onBlur={onBlur}
          error={error}
          fieldRef={fieldRef}
          placeholder={field.placeholder}
        />
      );

    case "groupList":
      return (
        <ServiceGroupListField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          fieldRef={fieldRef}
          errorFor={errorFor ?? (() => undefined)}
          registerEntry={registerEntry}
          onBlurEntry={onBlurEntry}
        />
      );

    default:
      return null;
  }
}
