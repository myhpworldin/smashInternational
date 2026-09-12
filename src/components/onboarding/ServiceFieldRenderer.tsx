import type { ServiceFieldDef } from "@/shared/config/services";
import TextField from "@/components/form/fields/TextField";
import TextAreaField from "@/components/form/fields/TextAreaField";
import ChipGroupField from "@/components/form/fields/ChipGroupField";
import TagsField from "@/components/form/fields/TagsField";

type ServiceFieldRendererProps = {
  field: ServiceFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
};

const YES_NO_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

// The one place that turns a catalog field definition into an actual
// control — every service in shared/config/services.ts renders through
// this, so adding a new service never means writing new form UI.
export default function ServiceFieldRenderer({ field, value, onChange, error }: ServiceFieldRendererProps) {
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
          error={error}
        />
      );

    case "textarea":
      return (
        <TextAreaField
          label={field.label}
          required={field.required}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          error={error}
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
          error={error}
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
        />
      );

    case "tags":
      return (
        <TagsField
          label={field.label}
          required={field.required}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          error={error}
        />
      );

    default:
      return null;
  }
}
