import { isFieldActive, type ServiceFieldDef } from "@/shared/config/services";
import ServiceFieldRenderer from "@/components/onboarding/ServiceFieldRenderer";

type ServiceGroupListFieldProps = {
  field: ServiceFieldDef;
  value: unknown;
  onChange: (value: Record<string, unknown>[]) => void;
  error?: string;
  fieldRef?: (el: HTMLDivElement | null) => void;
  errorFor: (entryIndex: number, subKey: string) => string | undefined;
  registerEntry?: (entryIndex: number, subKey: string) => (el: HTMLDivElement | null) => void;
  onBlurEntry?: (entryIndex: number, subKey: string) => void;
};

// Renders a "groupList" field as a set of repeatable cards, one per entry
// (e.g. one per campaign objective) — each card is its own mini-form built
// from `field.groupFields` via the same ServiceFieldRenderer every scalar
// field uses, so a new sub-field never means new group UI either.
export default function ServiceGroupListField({
  field,
  value,
  onChange,
  error,
  fieldRef,
  errorFor,
  registerEntry,
  onBlurEntry,
}: ServiceGroupListFieldProps) {
  const entries = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const groupFields = field.groupFields ?? [];
  const entryLabel = field.entryLabel ?? field.label;

  const updateEntry = (index: number, key: string, entryValue: unknown) => {
    const next = entries.map((entry, i) => {
      if (i !== index) return entry;
      const nextEntry = { ...entry, [key]: entryValue };
      // Same dependent-field cleanup as the top-level form — hide and drop
      // a sub-field's stale value once its controlling sub-field changes.
      for (const subField of groupFields) {
        if (subField.dependsOn?.key === key && !isFieldActive(subField, nextEntry)) {
          delete nextEntry[subField.key];
        }
      }
      return nextEntry;
    });
    onChange(next);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    onChange([...entries, {}]);
  };

  return (
    <div ref={fieldRef} className="flex flex-col gap-3">
      <p className="font-body text-sm text-bone">
        {field.label}
        {field.required && (
          <span aria-hidden="true" className="ml-1 text-smash-text">
            *
          </span>
        )}
      </p>

      {entries.length === 0 && (
        <p className="font-body text-xs text-ash">No {entryLabel.toLowerCase()}s added yet.</p>
      )}

      {entries.map((entry, index) => (
        <div key={index} className="flex flex-col gap-4 border border-carbon p-4">
          <div className="flex items-center justify-between">
            <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">
              {entryLabel} {index + 1}
            </p>
            <button
              type="button"
              onClick={() => removeEntry(index)}
              className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
            >
              Remove
            </button>
          </div>
          {groupFields
            .filter((subField) => isFieldActive(subField, entry))
            .map((subField) => (
              <ServiceFieldRenderer
                key={subField.key}
                field={subField}
                value={entry[subField.key]}
                onChange={(v) => updateEntry(index, subField.key, v)}
                onBlur={onBlurEntry ? () => onBlurEntry(index, subField.key) : undefined}
                fieldRef={registerEntry?.(index, subField.key)}
                error={errorFor(index, subField.key)}
              />
            ))}
        </div>
      ))}

      {error && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={addEntry}
        className="self-start font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
      >
        + Add {entryLabel.toLowerCase()}
      </button>
    </div>
  );
}
